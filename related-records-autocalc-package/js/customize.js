(function() {
    "use strict";

    // GET PLUGIN SETTINGS
    var config = kintone.plugin.app.getConfig('');
    console.log(config);

    let calculationFunction = ""; //FIXME: change to config.whatevermethodisnext

    // INTERNAL SETTINGS
    const QUERYLIMIT = 500;
    const appId = kintone.app.getId();
    let datasourceAppId = "";
    const makeCalculation = function(callback, array) {
        return callback(array);
    };

    let outputFieldValue = makeCalculation.bind(null, calculationFunction);
    
    const fetchAllRecords = function(params, filter, limit, opt_offset, opt_records) {
        let offset = opt_offset || 0;
        let allRecords = opt_records || [];

        params["query"] = `${filter} limit ${limit} offset ${offset}`;

        return kintone.api(kintone.api.url("/k/v1/records", true), "GET", params).then(function(response) {
            allRecords = allRecords.concat(response.records);
            if (response.records.length === limit) {
                return fetchAllRecords(params, filter, offset + limit, allRecords);
            }
            return allRecords;
        });
    };

    kintone.events.on([
        // "app.record.index.show", Not in API: 'app.record.index.show is not allowed to return "Thenable" object.'
        "app.record.index.edit.submit",
        "app.record.create.submit",
        "mobile.app.record.create.submit",
        "app.record.edit.submit",
        "mobile.app.record.edit.submit"
    ], function(event) {
        const record = event.record;

        return kintone.api(kintone.api.url("/k/v1/app/form/fields", true), "GET", {"app": appId})
        .then(function(resp) {

            // organize the filter conditions
            const properties = resp.properties;
            let relatedRecordsField = properties[displayAppRelatedRecordsFieldCode];
            let referenceTable = relatedRecordsField["referenceTable"];

            datasourceAppId = referenceTable["relatedApp"]["app"];

            let displayAppFetchConditionField = referenceTable["condition"]["field"];
            let datasourceAppFetchConditionField = referenceTable["condition"]["relatedField"];

            let fetchCriteria = `${datasourceAppFetchConditionField} = ${record[displayAppFetchConditionField].value}`;

            let filterCond = referenceTable["filterCond"];

            let queryFilterSubstring = fetchCriteria;
            if (filterCond.length > 0) {
                queryFilterSubstring = `${queryFilterSubstring} and ${filterCond}`;
            }

            const requestParams = {
                "fields": targetFieldCodeInDatasourceApp,
                "app": datasourceAppId,
                "query": queryFilterSubstring,
                "totalCount": true
            };
            
            return fetchAllRecords(requestParams, queryFilterSubstring, QUERYLIMIT); // FIXME: JSWatchdog throwing an XSS warning here
        })
        .then(function(resp) {
            let targetFieldValues = resp.map(function(rec) {
                return rec[targetFieldCodeInDatasourceApp]["value"];
            });

            // calculation runs here
            record[outputFieldCodeInDisplayApp]["value"] = outputFieldValue(targetFieldValues);
            return event;
        })
        .catch(function(err) {
            console.log("Promise chain error: ", err);
        });
    });

    kintone.events.on([
        "app.record.edit.show",
        "app.record.create.show",
        "app.record.index.edit.show"
    ],
    function(event) {
    // Restricting the input of the output field
        event.record[outputFieldCodeInDisplayApp]["disabled"] = true;
        return event;
    });
})();

jQuery.noConflict();
(function($) {
    "use strict";
    // USER-DEFINED SETTINGS (to be added to plugin settings)...needs an API call to get form fields
    var displayAppRelatedRecordsFieldCode = "first_place_wins_rr";

    // Once displayAppRelatedRecordsFieldCode is gotten in the plugin settings,
    // present options to match targetFieldCodeInDatasourceApp
    // The field code here to be type checked to a number
    var targetFieldCodeInDatasourceApp = "num_points";

    var lastCompleteSyncTimeStamp = null;
    var outputFieldCodeInDisplayApp = "total_points";
    var calculationFunction;
    // calculationFunction can be replaced with any function that
    // takes in many numbers and outputs one number

    var sum = function(acc, curr) {
        return Number(acc) + Number(curr);
    };

    calculationFunction = sum;

    // INTERNAL SETTINGS
    var QUERYLIMIT = 500;
    var appId = kintone.app.getId();
    var datasourceAppId = "";
    var makeCalculation = function(callback, array) {
        return array.reduce(function(acc, curr) {
            return callback(acc, curr);
        });
    };

    var outputFieldValue = makeCalculation.bind(null, calculationFunction);

    kintone.events.on([
        // "app.record.index.show", Not in API: 'app.record.index.show is not allowed to return "Thenable" object.'
        "app.record.index.edit.submit",
        "app.record.create.submit",
        "mobile.app.record.create.submit",
        "app.record.edit.submit",
        "mobile.app.record.edit.submit"
    ], function(event) {
        var record = event.record;

        return kintone.api(kintone.api.url("/k/v1/app/form/fields", true), "GET", {"app": appId})
        .then(function(resp) {

            // organize the filter conditions
            var properties = resp.properties;
            var relatedRecordsField = properties[displayAppRelatedRecordsFieldCode];
            var referenceTable = relatedRecordsField["referenceTable"];

            datasourceAppId = referenceTable["relatedApp"]["app"];

            var displayAppFetchConditionField = referenceTable["condition"]["field"];
            var datasourceAppFetchConditionField = referenceTable["condition"]["relatedField"];

            var fetchCriteria = datasourceAppFetchConditionField + " = " +
                record[displayAppFetchConditionField]["value"];

            var filterCond = referenceTable["filterCond"];

            var queryFilterSubstring = fetchCriteria;
            if (filterCond.length > 0) {
                queryFilterSubstring = queryFilterSubstring + " and " + filterCond;
            }

            var requestParams = {
                "fields": [targetFieldCodeInDatasourceApp],
                "app": datasourceAppId,
                // "query": see fetchAllRecords,
                "totalCount": true
            };

            var fetchAllRecords = function(params, filter, opt_offset, opt_records) {
                var offset = opt_offset || 0;
                var allRecords = opt_records || [];

                params["query"] = filter + " limit " + QUERYLIMIT + " offset " + offset;

                return kintone.api(kintone.api.url("/k/v1/records", true), "GET", params).then(function(response) {
                    allRecords = allRecords.concat(response.records);
                    if (response.records.length === QUERYLIMIT) {
                        return fetchAllRecords(params, filter, offset + QUERYLIMIT, allRecords);
                    }
                    return allRecords;
                });
            };
            
            return fetchAllRecords(requestParams, queryFilterSubstring); // FIXME: JSWatchdog throwing an XSS warning here
        })
        .then(function(resp) {
            var targetFieldValues = resp.map(function(rec) {
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
})(jQuery);

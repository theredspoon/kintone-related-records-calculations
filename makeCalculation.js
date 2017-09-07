(function() {
    "use strict";
    // USER-DEFINED SETTINGS (to be added to plugin settings)...needs an API call to get form fields
    let displayAppRelatedRecordsFieldCode = "first_place_wins_rr";

    // Once displayAppRelatedRecordsFieldCode is gotten in the plugin settings,
    // present options to match targetFieldCodeInDatasourceApp
    // The field code here to be type checked to a number
    let targetFieldCodeInDatasourceApp = "num_points";

    let lastCompleteSyncTimeStamp = null;
    let outputFieldCodeInDisplayApp = "total_points";
    let calculationFunction;
    // calculationFunction can be replaced with any function that
    // takes in many numbers and outputs one number

    // possible calculation functions: sum, product, total count, count uniques, count nonempty values
    const sum = function (array) {
        return array.reduce(function(acc, curr) {
            return Number(acc) + Number(curr);
        });
    };

    const product = function (array) {
        return array.reduce(function(acc, curr) {
            return Number(acc) * Number(curr);
        });
    };

    const totalNumber = function(array) {
        return array.length;
    };

    const countUniques = function (array) {
        return array.reduce(function(acc, curr) { // needs testing
            if (acc.indexOf(curr) === -1) {
                return acc.concat(curr);
            } else {
                return acc;
            }
        }, []).length;
    }

    const countNonemptyValues = function(acc, curr) { // is 0 an empty value? no
        return array.reduce(function(acc, curr) { // needs testing on dates
            if (curr !== "") {
                return acc.concat(curr);
            } else {
                return acc;
            }
        }, []).length;
    };

    const countNonzeroValues = function(acc, curr) {
        return array.reduce(function(acc, curr) { // is this for strings too?
            if (curr !== 0) {
                return acc.concat(curr);
            } else {
                return acc;
            }
        }, []).length;
    }

    // what items in an array are also on another list?
    const getMatchesToList = function(list, array) { // needs testing
        return array.reduce(function(acc, curr){
            // if curr is on the list, add to matches
            if (list.indexOf(curr) !== -1) {
                return acc.concat(curr);
            } else {
                return acc;
            }
        }, []);
    }

    // how many items in the array are also on the list?
        // count instances of a specified value? <-- subcase
    const countMatchesToList = function(list, array) {
        return getMatchesToList(list, array).length;
    }

    calculationFunction = sum;

    // INTERNAL SETTINGS
    const QUERYLIMIT = 500;
    const appId = kintone.app.getId();
    let datasourceAppId = "";
    const makeCalculation = function(callback, array) {
        return callback(array);
    };

    let outputFieldValue = makeCalculation.bind(null, calculationFunction);

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
                "fields": [targetFieldCodeInDatasourceApp],
                "app": datasourceAppId,
                "query": queryFilterSubstring,
                "totalCount": true
            };

            const fetchAllRecords = function(params, filter, opt_offset, opt_records) {
                let offset = opt_offset || 0;
                let allRecords = opt_records || [];

                params["query"] = `${filter} limit ${QUERYLIMIT} offset ${offset}`;

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

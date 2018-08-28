(function(PLUGIN_ID) {
    "use strict";
    
    // CUSTOMIZATION SETTINGS
    const QUERYLIMIT = 500;
    const APPID = kintone.app.getId();
    const CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);

    // HELPER FUNCTIONS
    function fetchAllRecords (params, filter, limit, opt_offset, opt_records) {
        let offset = opt_offset || 0;
        let allRecords = opt_records || [];

        params["query"] = `${filter} limit ${limit} offset ${offset}`;

        return kintone.api(kintone.api.url("/k/v1/records", true), "GET", params).then(function(response) {
            allRecords = allRecords.concat(response.records);
            if (response.records.length === limit) {
                return fetchAllRecords(params, filter, offset + limit, allRecords);
                // is this supposed to be...: 
                // return fetchAllRecords(params, filter, limit, offset + limit, allRecords)
                // ?
            }
            return allRecords;
        });
    }

    function createQuerySubstring (relatedRecord, displayAppRecord) {
        let referenceTable = relatedRecord["referenceTable"];

        let displayAppFetchConditionField = referenceTable["condition"]["field"];
        let relatedAppFetchConditionField = referenceTable["condition"]["relatedField"];
        let filterCond = referenceTable["filterCond"];

        let fetchCriteria = `${relatedAppFetchConditionField} = "${displayAppRecord[displayAppFetchConditionField].value}"`;

        if (filterCond.length > 0) {
            return `${fetchCriteria} and ${filterCond}`;
        }
        return fetchCriteria;
    }

    function rehydrateConfig (config) {
        let rehydratedArray = [];
        for (let computation in config) {
            rehydratedArray = rehydratedArray.concat(JSON.parse(config[computation]));
        }
        return rehydratedArray;
    }

    function isRelatedAppTargetFieldDisplayed (relatedRecord, targetDisplayFieldCode) {
        return relatedRecord["referenceTable"]["displayFields"].indexOf(targetDisplayFieldCode) !== -1;
    }

    // CALCULATION FUNCTIONS

    // TODO: handle undefined / empty arrays
    function sum (array) {
        if (!array.length) {
            return 0;
        }
        return array.reduce(function(acc, curr) {
            return Number(acc) + Number(curr);
        });
    }
    
    function product (array) {
        if (!array.length) {
            return 0;
        }
        return array.reduce(function(acc, curr) {
            return Number(acc) * Number(curr);
        });
    }
    
    function totalNumber (array) {
        return array.length;
    }
    
    function mean (array) {
        if (!array.length) {
            return 0;
        }
        return sum(array) / array.length;
    }
    
    function median (array) {
        if (!array.length) {
            return 0;
        }
        var numbers = args.slice(0).sort((a,b) => a - b);
        var middle = Math.floor(numbers.length / 2);
        var isEven = numbers.length % 2 === 0;
        return isEven ? (numbers[middle] + numbers[middle - 1]) / 2 : numbers[middle];
    }
    
    function countUniques (array) {
        return array.reduce(function(acc, curr) { // needs testing
            if (acc.indexOf(curr) === -1) {
                return acc.concat(curr);
            }
            return acc;
        }, []).length;
    }

    function countNonemptyValues (acc, curr) { // is 0 an empty value? no
        return array.reduce(function(acc, curr) { // needs testing on dates
            if (curr !== "") {
                return acc.concat(curr);
            }
            return acc;
        }, []).length;
    }

    function countNonzeroValues (acc, curr) {
        return array.reduce(function(acc, curr) { // needs testing on dates
            if (curr !== 0) {
                return acc.concat(curr);
            }
            return acc;
        }, []).length;
    }

    const calcFuncs = {
        sum,
        product,
        totalNumber,
        mean,
        median,
        countNonzeroValues,
        totalNumber,
        countUniques,
        countNonemptyValues
    };

    // GET USABLE PLUGIN SETTINGS
    let rehydratedConfig = rehydrateConfig(CONFIG);

    kintone.events.on([
        // "app.record.index.show", Not in API: 'app.record.index.show is not allowed to return "Thenable" object.'
        "app.record.index.edit.submit",
        "app.record.create.submit",
        "mobile.app.record.create.submit",
        "app.record.edit.submit",
        "mobile.app.record.edit.submit"
    ], function(event) {
        const displayAppRecord = event.record;

        return kintone.api(kintone.api.url("/k/v1/app/form/fields", true), "GET", {"app": APPID})
        .then(function(resp) {
            // Promise.all for each computation
            return Promise.all(rehydratedConfig.map(function getRRValues (computation) {
                let displayAppRRFieldCode = computation.displayAppRRField.code;
                let relatedAppId = computation.relatedAppId;
                let relatedAppTargetFieldCode = computation.relatedAppTargetField.code;
                let outputFieldCode = computation.outputField.code;
                let calcFunc = computation.calcFuncField;
                
                let relatedRecordsField = resp.properties[displayAppRRFieldCode];
                
                if (!relatedRecordsField) {
                    throw new Error(`The related records field ${displayAppRRFieldCode} is not found.
                    Please update plugin settings for Related Records Autocalc or your
                    app may behave unpredictably.`)
                } else if (!isRelatedAppTargetFieldDisplayed(relatedRecordsField, relatedAppTargetFieldCode)) {
                    throw new Error(`The field ${relatedAppTargetFieldCode} inside the related records field ${displayAppRRFieldCode}is not found.
                    Please update plugin settings for Related Records Autocalc or your
                    app may behave unpredictably.`);
                } else if (!displayAppRecord[outputFieldCode]) {
                    throw new Error(`The field ${outputFieldCode} to output your related records
                    calculations is not found. Please update plugin settings for Related Records Autocalc or your
                    app may behave unpredictably.`)
                }
                
                let queryFilterSubstring = createQuerySubstring(relatedRecordsField, displayAppRecord);

                const initialRequestParams = {
                    "fields": [relatedAppTargetFieldCode],
                    "app": relatedAppId,
                    "query": queryFilterSubstring,
                    "totalCount": true
                };
                
                return fetchAllRecords(initialRequestParams, queryFilterSubstring, QUERYLIMIT)
                .then(function(resp) {
                    let targetFieldValues = resp.map(function(relatedAppRecord) {
                        return relatedAppRecord[relatedAppTargetFieldCode]["value"];
                    });
                    
                    // calculation runs here
                    displayAppRecord[outputFieldCode]["value"] = calcFuncs[calcFunc.fn](targetFieldValues);
                    return displayAppRecord[outputFieldCode]["value"];
                })
            }))
            .then(function (resp) {
                return event;
            })
            .catch(function(err) {
                console.error("Promise chain error: ", err);
            });
        });
    });

    kintone.events.on([
        "app.record.edit.show",
        "app.record.create.show",
        "app.record.index.edit.show"
    ],
    function(event) {
    // Restricting the input of the output field
    // do this for all allocated output fields
        rehydratedConfig.forEach(function(computation) {
            event.record[computation.outputField.code]["disabled"] = true;
        });

    // Restrict editing field settings of related records field
        return event;
    });
})(kintone.$PLUGIN_ID);

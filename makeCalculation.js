"use strict"
/*
Takes in a Kintone event and a callback function
Makes API calls to get an array of numbers
Outputs a number
*/

/* Tests
*/

/*
Requirements:
*/

// User-Defined Settings

var displayAppRelatedRecordsFieldCode = "";

// Once displayAppRelatedRecordsFieldCode is gotten in the plugin settings,
// present options to match targetFieldCodeInDatasourceApp
// The field code here to be type checked to a number
var targetFieldCodeInDatasourceApp = "";

var lastCompleteSyncTimeStamp = null;
var outputFieldCodeInDisplayApp = "";
var calculationFunction = function (acc, curr) {
    return Number(acc) + Number(curr);
};

// Internal Settings
var appId = kintone.app.getId();
var datasourceAppId = ""
var makeCalculation = function (callback, array) {
    return array.reduce(function (acc, curr) {
        return callback(acc, curr);
    });
};

var outputFieldValue = makeCalculation.bind(null, calculationFunction);

kintone.events.on([
    "app.record.edit.show",
    "mobile.app.record.edit.show",
    "app.record.detail.show",
    "mobile.app.record.detail.show",
    "app.record.create.submit",
    "mobile.app.record.create.submit"
], function (event) {
    var record = event.record

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

        // construct the RR query string

        var queryFilterSubstring = fetchCriteria;

        if (filterCond.length > 0) {
            queryFilterSubstring = queryFilterSubstring + " and " + filterCond;
        }

        // FIXME: handle filtered records when total related records > 500
        var queryString = queryFilterSubstring + " order by $id asc limit 500 offset 0"

        // API call to get the related records
        var requestParams = {
            "fields": [targetFieldCodeInDatasourceApp],
            "app": datasourceAppId,
            "query": queryString,
            "totalCount": true
        }

        return kintone.api(kintone.api.url("/k/v1/records", true), "GET", requestParams);
    })
    .then(function(resp) {
        console.log(resp);
        // run calculation here
        var targetFieldValues = resp["records"].map(function (rec) {
            return rec[targetFieldCodeInDatasourceApp]["value"];
        });
        console.log(outputFieldValue(targetFieldValues));
        record[outputFieldCodeInDisplayApp]["value"] = outputFieldValue(targetFieldValues);
        return event;
    })
    .catch(function(err) {
        console.log("Promise chain error: ", err);
    });
});

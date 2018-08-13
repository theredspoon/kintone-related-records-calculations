"use strict"

// CALCULATION FUNCTIONS
var NUMCALCFUNCTIONS = {
    "Sum": {name: "Sum", fn: "sum"},
    "Product": {name: "Product", fn: "product"},
    "Count": {name: "Count", fn: "totalNumber"},
    "Mean": {name: "Mean", fn: "mean"},
    "Median": {name: "Median", fn: "median"},
    "Count Non-zero Values": {name: "Count Non-zero Values", fn: "countNonzeroValues"}
}
var TEXTCALCFUNCTIONS = {
    "Count All": {name: "Count All", fn: "totalNumber"},
    "Count Uniques": {name: "Count Uniques", fn: "countUniques"},
    "Count Non-empty Values": {name: "Count Non-empty Values", fn: "countNonemptyValues"}
};

// CONFIG FUNCTIONS
var appId = kintone.app.getId();

function rehydrateComputations(config) {
    let rehydratedArray = [];
    for (let computation in config) {
        rehydratedArray = rehydratedArray.concat(JSON.parse(config[computation]));
    }
    return rehydratedArray;
}

function getFormFields (id) {
    // TODO: spinner while waiting
    return kintone.api(kintone.api.url("/k/v1/app/form/fields", true), "GET", {"app": id})
        .then(function (resp) {
            return resp.properties;
        }).catch(function (err) {
            console.log('getFormFields err', err);
        });
}

function isFieldTypeNumeric(field) {
    return field.type === "NUMBER";
}

function isFieldTypeDisplayed (fieldType) {
    switch (fieldType) {
        case "SINGLE_LINE_TEXT":
        case "NUMBER":
            return true;
        case "RECORD_NUMBER":
        case "__ID__":
        case "__REVISION__":
        case "CREATOR": // needs value.name (not just value)
        case "CREATED_TIME":
        case "MODIFIER": // needs value.name (not just value)
        case "UPDATED_TIME":
        case "CALC":
        case "MULTI_LINE_TEXT":
        case "RICH_TEXT":
        case "CHECK_BOX": // needs to handle an array of values
        case "RADIO_BUTTON":
        case "DROP_DOWN":
        case "MULTI_SELECT": // to pass through, needs to handle an array of values
        case "FILE": // needs to handle an array of objects
        case "LINK":
        case "DATE":
        case "TIME":
        case "DATETIME":
        case "USER_SELECT": // needs to handle an array of objects value[i].name
        case "ORGANIZATION_SELECT": // needs to handle an array of objects value[i].name
        case "GROUP_SELECT": // needs to handle an array of objects value[i].name
        case "CATEGORY": // needs to handle an array of values
        case "STATUS":
        case "STATUS_ASSIGNEE": // needs to handle an array of objects value[i].name
        case "SUBTABLE": // needs to handle an object of objects
        default:
            return false;
    }
}

function getRRDisplayFieldPropsFromRelatedApp (relatedAppFields, displayField) {
    for (let relatedAppField in relatedAppFields) {
        if (displayField === relatedAppFields[relatedAppField].code) {
            return {
                label: relatedAppFields[relatedAppField].label,
                code: relatedAppFields[relatedAppField].code,
                type: relatedAppFields[relatedAppField].type
            };
        }
    }
}

function getRRDisplayFieldProps (fieldList) {
    let records = [];
    let relatedAppId = "";
    let relatedRecord = {};
    let displayFields = {};
    let displayFieldArray = [];
    let recordsList = Object.values(fieldList).filter(field => {
        return field.type === 'REFERENCE_TABLE';
    });

    // TODO: spinner while waiting

    // Make API call to related apps to get additional data on RR display fields
    return Promise.all(recordsList.map(function(relatedRecord) {
        relatedAppId = relatedRecord.referenceTable.relatedApp.app;
        return getFormFields(relatedAppId)
        .then(function (relatedAppFieldList) {
            displayFieldArray = relatedRecord.referenceTable.displayFields;

            // turn each string in the array into an object
            displayFieldArray = displayFieldArray.map(
                (displayField)=>getRRDisplayFieldPropsFromRelatedApp(relatedAppFieldList, displayField))
            .filter((field)=>isFieldTypeDisplayed(field.type));

            // turn the array into an object
            relatedRecord.referenceTable.displayFields = {};
            for (let field of displayFieldArray) {
                relatedRecord.referenceTable.displayFields[field.code] = field;
            }
            return relatedRecord;
        })
        .catch(function (err) {
            console.error('error in getRRDisplayFieldProps: ', err);
        })
    }));
}

function setOutputFields (fieldList) {
    return Object.values(fieldList).filter(field => isFieldTypeNumeric(field))
        .map(field => {
            return {
                label: field.label,
                code: field.code,
                type: field.type
            }
        });
}

function setConfigFields (config) {
    return getFormFields(appId).then(function (resp) {
        getRRDisplayFieldProps(resp).then(function (records) {
            Object.assign(config, {
                "formFields": resp,
                "relatedRecords": records,
                "outputFields": setOutputFields(resp)
            })
        })

    }).catch(function (err) {
        console.error('error in setConfigFields: ', err);
    });
}

// Given a related record field, get the display app fields associated with that RR
function getRelatedAppDisplayFields (selectedRRField, RRArray) {
    for (let i = 0, l = RRArray.length; i < l; i++) {
        if (RRArray[i].code === selectedRRField.code) {
            return RRArray[i].referenceTable.displayFields;
        }
    }
}

function getCalcFuncFields(field, calcFunctions) {
    return isFieldTypeNumeric(field) ? 
    calcFunctions.num : calcFunctions.text;
}

function passErrorHandler(computations) {
    let outputFieldCodes = [];
    for (let computation of computations) {

        // if computation form fields are incomplete
        if (!computation.calcFuncField.fn) {
            throw new Error("Please fill out all the form fields completely.");
        }
        
        // if one output field handles more than one computation
        if (outputFieldCodes.indexOf(computation.outputField.code) === -1) {
            outputFieldCodes = outputFieldCodes.concat(computation.outputField.code);
        } else {
            throw new Error("Please connect one output field to exactly one calculation.");
        }

        // if previously saved field is no longer found after the API call updates the list

    };
    return true;
}
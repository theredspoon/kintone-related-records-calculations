"use strict"

// CALCULATION FUNCTIONS
var NUMCALCFUNCTIONS = {
    "Sum": {name: "Sum", function: sum},
    "Product": {name: "Product", function: product},
    "Count": {name: "Count", function: totalNumber},
    "Mean": {name: "Mean", function: mean},
    "Median": {name: "Median", function: median},
    "Count Non-zero Values": {name: "Count Non-zero Values", function: countNonzeroValues}
}
var TEXTCALCFUNCTIONS = {
    "Count All": {name: "Count All", function: totalNumber},
    "Count Uniques": {name: "Count Uniques", function: countUniques},
    "Count Non-empty Values": {name: "Count Non-empty Values", function: countNonemptyValues}
};

function sum (array) {
    return array.reduce(function(acc, curr) {
        return Number(acc) + Number(curr);
    });
};

function product (array) {
    return array.reduce(function(acc, curr) {
        return Number(acc) * Number(curr);
    });
};

function totalNumber (array) {
    return array.length;
};

function mean (array) {
    return sum(array) / array.length;
};

function median (array) {
    if (!array.length) {
        return 0
    };
    var numbers = args.slice(0).sort((a,b) => a - b);
    var middle = Math.floor(numbers.length / 2);
    var isEven = numbers.length % 2 === 0;
    return isEven ? (numbers[middle] + numbers[middle - 1]) / 2 : numbers[middle];
};

// not including mode since it's unclear how ties
// would be handled in a way that returns one value
function mode (array) {
    return;
};

function countUniques (array) {
    return array.reduce(function(acc, curr) { // needs testing
        if (acc.indexOf(curr) === -1) {
            return acc.concat(curr);
        } else {
            return acc;
        }
    }, []).length;
}

function countNonemptyValues (acc, curr) { // is 0 an empty value? no
    return array.reduce(function(acc, curr) { // needs testing on dates
        if (curr !== "") {
            return acc.concat(curr);
        } else {
            return acc;
        }
    }, []).length;
};

function countNonzeroValues (acc, curr) {
    return array.reduce(function(acc, curr) { // needs testing on dates
        if (curr !== 0) {
            return acc.concat(curr);
        } else {
            return acc;
        }
    }, []).length;
}

// CONFIG FUNCTIONS
var appId = kintone.app.getId();

function getFormFields (id) {
    return kintone.api(kintone.api.url("/k/v1/app/form/fields", true), "GET", {"app": id})
        .then(function (resp) {
            return resp.properties;
        }).catch(function (err) {
            console.log('getFormFields err', err);
        });
}

function setFormFields(fieldList, config) {
    Object.assign(config, {
        "formFields": fieldList
    })
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

function setRRInfo (fieldList, config) {
    var records = [];
    var relatedAppId = "";
    var relatedRecord = {};
    var displayFields = {};
    var displayFieldArray = [];
    var recordsList = Object.values(fieldList).reduce((acc, currVal) => {
        if (currVal.type === 'REFERENCE_TABLE') {
            acc = acc.concat(currVal);
        }
        return acc;
    }, []);

    Promise.all(recordsList.map(function(relatedRecord) {
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
        }).catch(function (err) {
            console.log('error in setRRInfo: ', err);
        })
    }))
    .then(function(records) {
        Object.assign(config, {
            "relatedRecords": records
        });
    });
}

function setCalculationOutputFields (fieldList, config) {
    var textOutputFields = [];
    var numOutputFields = [];
    for (var field in fieldList) {
        if (fieldList[field].type === "SINGLE_LINE_TEXT" && fieldList[field].expression === "") {
            textOutputFields = textOutputFields.concat({
                label: fieldList[field].label,
                code: fieldList[field].code,
                type: fieldList[field].type
            });
        } else if (fieldList[field].type === "NUMBER") {
            numOutputFields = numOutputFields.concat({
                label: fieldList[field].label,
                code: fieldList[field].code,
                type: fieldList[field].type
            });
        }
    }
    Object.assign(config, {
        "calculationOutputFields": {
            "textOutputFields": textOutputFields,
            "numOutputFields": numOutputFields
        }
    });
}

function setConfigFields (conf, cb) {
    return getFormFields(appId).then(function (resp) {
        setFormFields(resp, conf);
        setRRInfo(resp, conf);
        setCalculationOutputFields(resp, conf);
    }).catch(function (err) {
        console.log('error in setConfigFields: ', err);
    });
}

// Given a related record field code, get the display app field codes associated with that RR
function getRelatedAppDisplayFields (selectedRRField, RRArray) {
    for (let i = 0, l = RRArray.length; i < l; i++) {
        if (RRArray[i].code === selectedRRField.code) {
            return RRArray[i].referenceTable.displayFields;
        }
    }
}

function isFieldTypeNumeric (field) {
    return field.type === "NUMBER";
}

function getOutputFields(field, calculationOutputFields) {
    return isFieldTypeNumeric(field) ? 
    calculationOutputFields.numOutputFields : calculationOutputFields.textOutputFields;
}

function getCalcFields(field, calcFunctions) {
    return isFieldTypeNumeric(field) ? 
    calcFunctions.num : calcFunctions.text;
}
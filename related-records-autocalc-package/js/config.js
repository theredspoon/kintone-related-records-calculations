(function(PLUGIN_ID) {
    "use strict";
    
    // Get previous settings from kintone app
    var CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
    console.log('getConfig is ', CONFIG);

    // TODO: pass CONFIG into <select> options to prepopulate
    // before making API call to update any field changes

    // kintone.plugin.app.setConfig({});

    
    let previouslySavedComputations = rehydrateComputations(CONFIG);
    console.log('previouslySavedComputations is ', previouslySavedComputations);

    var data = {
        "calcFunctions": {
            "num": NUMCALCFUNCTIONS,
            "text": TEXTCALCFUNCTIONS
        },
        "formFields": {},
        "relatedRecords": previouslySavedComputations.map(comp => comp.displayAppRRField) || [],
        "outputFields": previouslySavedComputations.map(comp => comp.outputField) || [],
        "counter": previouslySavedComputations.length || 0,
        "computations": previouslySavedComputations || [] // settings to pass into customize.js will come from here
    };

    console.log('data before setConfigFields is', setTimeout(() => data, 0));
    
    setConfigFields(data);
    // TODO: error check current data against saved data

    console.log('data after setConfigFields is ', data);

    // Register Vue components (must be done before Vue instantiation)
    Vue.component("relatedRecordsSelect", {
        data: function() {
            return {
                selected: !!this.displayAppRRField ? this.displayAppRRField : "Select a field"
            };
        },
        methods: {
            handleChange: function() {
                this.$emit("relatedRecordsFieldSelected", this.selected)
            }
        },
        template: `
            <div>
                Pick a related records field
                <select v-model="selected" @change="handleChange">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="record in relatedRecords" v-bind:value="record" :key="record.code">
                        {{record.label}} ({{record.code}})
                    </option>
                </select>
                <span>Selected: {{this.displayAppRRField.code}}</span>
            </div>
        `,
        props: ["relatedRecords", "displayAppRRField"]
    });

    Vue.component("relatedAppFieldCodeSelect", {
        data: function() {
            return {
                selected: !!this.relatedAppTargetField ? this.relatedAppTargetField : "Select a field"
            };
        },
        methods: {
            handleChange: function() {
                this.$emit("relatedAppFieldCodeSelected", this.selected)
            },
            resetSelection: function() {
                this.selected = "Select a field";
            }
        },
        template: `
            <div>
                Pick a field from the related app to calculate.
                <select v-model="selected" @change="handleChange">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="value in relatedAppDisplayFields" v-bind:value="value" :key="value.code">
                        {{value.label}} ({{value.code}})
                    </option>
                </select>
                <span>Selected: {{this.relatedAppTargetField.code}}</span>
            </div>
        `,
        props: ["relatedAppDisplayFields", "relatedAppTargetField"]
    });

    /*
    Weird behavior on desktop:
    1) change RR field to option #1
    2) change display app target field
    3) change RR field to option #2
    4) change RR field to option #1
    Problem: display app target field doesn't reset
    Bigger problem: outputField gets stuck
    */

    Vue.component("outputFieldSelect", {
        data: function() {
            return {
                selected: !!this.outputField ? this.outputField : "Select a field"
            };
        },
        methods: {
            handleChange: function() {
                console.log("selected " + this.selected);
                this.$emit("outputFieldSelected", this.selected)
            },
            resetSelection: function() {
                this.selected = "Select a field";
            }
        },
        template: `
            <div>
                Pick a field from the display app to output the computation.
                <select v-model="selected" @change="handleChange">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="value in outputFields" v-bind:value="value" :key="value.code">
                        {{value.label}} ({{value.code}})
                    </option>
                </select>
                <span>Selected: {{this.outputField.code}}</span>
            </div>
        `,
        props: ["outputFields", "outputField"]
    });

    Vue.component("calcFuncSelect", {
        data: function() {
            return {
                selected: !!this.calcFuncField ? this.calcFuncField : "Select a field"
            };
        },
        methods: {
            handleChange: function() {
                this.$emit("calcFuncSelected", this.selected)
            },
            resetSelection: function() {
                this.selected = "Select a field";
            }
        },
        template: `
            <div>
                Pick a calculation to use on the target related records field.
                <select v-model="selected" @change="handleChange">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="value in calcFuncFields" v-bind:value="value" :key="value.fn">
                    {{value.name}}
                    </option>
                </select>
                <span>Selected: {{this.calcFuncField.name}}</span>
            </div>
        `,
        props: ["calcFuncFields", "calcFuncField"]
    });

    Vue.component('optionSelectDropdown', {
        data: function() {
            return {
                selection: !!this.entrySelection ? this.entrySelection : "Select a field",
            }
        },
        props: [
            "dropdownName",
            "dropdownTitle",
            "onChangeFunctionName",
            "dropdownEntries",
            "entrySelection"
        ],
        computed: {
            selected: {
                get: function() {
                    if (this.selection == "Select a field") {
                        return this.selection;
                    }
                    
                    if (this.selection.name != null) {
                        return this.selection.name;
                    } else if (this.selection.code != null) {
                        return this.selection.code;
                    }
                },
                set: function(newValue) {
                    if (newValue == "Select a field") {
                        this.selection = "Select a field";
                    }

                    if (this.selection.name != null) {
                        this.selection.name = newValue;
                    } else if (this.selection.code != null) {
                        this.selection.code = newValue;
                    }
                }
            }
        },
        watch: {
            selected: function (newSelection) {
                console.log(this.onChangeFunctionName)
                this.$emit(this.onChangeFunctionName, newSelection);
            }
        },
        methods: {
            resetSelection: function() {
                console.log("resetSelection called");
                this.selected = "Select a field";
            }
        },
        template: `
            <div>
                {{ dropdownTitle }}
                <select v-model="selected">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="entry in dropdownEntries">
                        <span v-if="entry.code != null">{{ entry.code }}</span>
                        <span v-else>{{ entry.name }}</span>
                    </option>
                </select>
            </div>
        `
    });

    Vue.component("computationItem", {
        data: function() {
            return {
                "relatedAppDisplayFields": !!this.computation.displayAppRRField ? getRelatedAppDisplayFields(this.computation.displayAppRRField, this.relatedRecords) : "",
                "calcFuncFields": !!this.computation.relatedAppTargetField ? getCalcFuncFields(this.computation.relatedAppTargetField, this.calcFunctions) : "",
                dropdownTitles: {
                    RRField: "Pick a related records field",
                    RAField: "Pick a field from the related app to calculate",
                    CFField: "Pick a calculation to use on the target related records field",
                    OField: "Pick a field from the display app to output the computation"
                },
                onChangeFunctionNames: {
                    RRField: "related-records-selected",
                    RAField: "related-app-field-selected",
                    CFField: "calc-func-selected",
                    OField: "output-field-selected"
                }
            };
        },
        props: [
            "calcFunctions",
            "formFields",
            "relatedRecords",
            "outputFields",
            "computation",
            "index",
            "length"
        ],
        methods: {
            handleRRSelection: function(selection) {
                console.log("handleRRSelection");
                // Set what the new related record field.
                this.computation.displayAppRRField = selection;
                // Set the related app id from related record.
                this.computation.relatedAppId = selection.referenceTable.relatedApp.app;

                // Set the new related app display fields
                this.relatedAppDisplayFields = getRelatedAppDisplayFields(selection, this.relatedRecords);
                console.log(this.relatedAppDisplayFields);
                // Set the target field for related app field to "".
                this.computation.relatedAppTargetField = "";
                // this.$refs.relatedAppFieldCodeSelect.resetSelection(); // reset v-model variable

                // Set the outputField to empty
                this.computation.outputField = "";
                // this.$refs.outputFieldSelect.resetSelection(); // reset v-model variable for outputfield
                
                // Clear calcFuncField and calcFuncFields
                this.computation.calcFuncField = "";
                this.calcFuncFields = {};
                // this.$refs.calcFuncSelect.resetSelection(); // reset v-model variable for calcfuncField
            },
            handleRAFieldSelection: function(selection) {
                this.computation.relatedAppTargetField = selection;
                this.calcFuncFields = getCalcFuncFields(selection, this.calcFunctions);
                this.computation.calcFuncField = "";
            },
            handleOutputFieldCodeSelection: function(selection) {
                this.computation.outputField = selection;
            },
            handleCalcFuncSelection: function(selection) {
                this.computation.calcFuncField = selection;
            },
            addNewComputation: function() {
                this.$emit("addNewComputation", this.index);
            },
            removeComputation: function() {
                this.$emit("removeComputation", this.index);
            }
        },
        template: `
            <div>
                <button @click="addNewComputation">+</button>
                <button v-if="length > 1" @click="removeComputation">-</button>
                
                <optionSelectDropdown
                    dropdownName="RRField"
                    v-bind:dropdownTitle="this.dropdownTitles.RRField"
                    v-bind:dropdownEntries="this.relatedRecords"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.RRField"
                    v-bind:entrySelection="computation.displayAppRRField"
                    @related-records-selected="handleRRSelection"
                ></optionSelectDropdown>

                <div v-if="true">
                    <optionSelectDropdown
                        dropdown-name="RAField"
                        v-bind:dropdown-title="this.dropdownTitles.RAField"
                        v-bind:dropdownEntries="this.relatedAppDisplayFields"
                        v-bind:onChangeFunctionName="this.onChangeFunctionNames.RAField"
                        v-bind:entrySelection="computation.relatedAppTargetField"
                        @relatedAppFieldSelected="handleRAFieldSelection"
                        ref="handleRAFieldSelection"
                    ></optionSelectDropdown>
                </div>

                <div v-if="true">
                    <optionSelectDropdown
                        dropdown-name="CFField"
                        v-bind:dropdown-title="this.dropdownTitles.CFField"
                        v-bind:dropdownEntries="this.calcFuncFields"
                        v-bind:onChangeFunctionName="this.onChangeFunctionNames.CFField"
                        v-bind:entrySelection="computation.calcFuncField"
                        @calcFuncSelected="handleCalcFuncSelection"
                        ref="calcFuncSelect"
                    ></optionSelectDropdown>
                </div>

                <optionSelectDropdown
                    dropdown-name="OField"
                    v-bind:dropdown-title="this.dropdownTitles.OField"
                    v-bind:dropdownEntries="this.outputFields"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.OField"
                    v-bind:entrySelection="computation.outputField"
                    @outputFieldSelected="handleOutputFieldCodeSelection"
                    ref="outputFieldSelect"
                ></optionSelectDropdown>
            </div>
        `
    });

    // todo: public function to clear selections based on component passed in.

    // instantiate Vue
    let vm = new Vue({
        // initial state
        data: data,
        el: "#plugin",
        created: function() {
            if (this.computations.length === 0) {
                this.handleAddComputation(0);
            }
        },
        methods: {
            count: function() {
                this.counter++;
                return this.counter;
            },
            handleAddComputation: function(index) {
                let before = this.computations.slice(0, index + 1);
                let after = this.computations.slice(index + 1, this.computations.length);
                this.computations = [...before, {
                    "displayAppRRField": "", 
                    "relatedAppId":"", 
                    "relatedAppTargetField": "",
                    "outputField": "", 
                    "calcFuncField": "",
                    "id": this.count()
                }, ...after];
            },
            handleRemoveComputation: function(index) {
                let before = this.computations.slice(0, index);
                let after = this.computations.slice(index + 1, this.computations.length);
                this.computations = [...before, ...after];
            },
            savePluginSettings: function() {
                try {
                    passErrorHandler(this.computations);
                    let dehydratedConfig = this.computations.reduce(function(acc, computation, index) {
                        acc[index] = JSON.stringify(computation);
                        return acc;
                    }, {});
                    kintone.plugin.app.setConfig(dehydratedConfig);
                } catch (error) {
                    console.error(error.message);
                    alert(error.message);
                }
            }
        },
        template: `
            <div>
                <computationItem
                    v-for="(computation, index) in computations"
                    @addNewComputation="handleAddComputation"
                    @removeComputation="handleRemoveComputation"
                    v-bind:computation="computation"
                    v-bind:index="index"
                    v-bind:length="computations.length"
                    v-bind:key="computation.id"
                    v-bind:calcFunctions="calcFunctions"
                    v-bind:formFields="formFields"
                    v-bind:outputFields="outputFields"
                    v-bind:relatedRecords="relatedRecords"
                />
                <button @click="savePluginSettings">SAVE</button>
            </div>
        `
    });

})(kintone.$PLUGIN_ID);

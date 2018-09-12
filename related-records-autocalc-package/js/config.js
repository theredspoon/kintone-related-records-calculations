(function(PLUGIN_ID) {
    "use strict";
    
    // Get previous settings from kintone app
    var CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
    // console.log('getConfig is ', CONFIG);

    // TODO: pass CONFIG into <select> options to prepopulate
    // before making API call to update any field changes

    // kintone.plugin.app.setConfig({});

    let previouslySavedComputations = rehydrateComputations(CONFIG);
    // console.log('previouslySavedComputations is ', previouslySavedComputations);

    var data = {
        "calcFunctions": {
            "num": NUMCALCFUNCTIONS,
            "text": TEXTCALCFUNCTIONS
        },
        // "formFields": {},
        // "relatedRecords": previouslySavedComputations.map(comp => comp.displayAppRRField) || [],
        // "outputFields": previouslySavedComputations.map(comp => comp.outputField) || [],
        "counter": previouslySavedComputations.length || 0,
        "computations": previouslySavedComputations || [] // settings to pass into customize.js will come from here
    };

    // We have nothing but "Related_Records" in the relatedrecords array.
    console.log("After inital rehydration related records: ");
    console.log(data);
    

    setConfigFields(data).then(function() {
        console.log("After setconfigfields related records: ");
        console.log(data);
    });

    // TODO: error check current data against saved data

    Vue.component('optionSelectDropdown', {
        data: function() {
            return {
                selected: !!this.entrySelection ? this.entrySelection : "Select a field",
            }
        },
        props: [
            "dropdownName",
            "dropdownTitle",
            "onChangeFunctionName",
            "dropdownEntries",
            "referenceEntries",
            "entrySelection"
        ],
        watch: {
            entrySelection: function (selection) {
                this.selected = !!this.entrySelection ? this.entrySelection : "Select a field";
            },
            selected: function(selection) {
                this.$emit(this.onChangeFunctionName, this.selected);
            }
        },
        methods: {
            resetSelection: function() {
                // console.log("ResetSelection called");
                this.selected = "Select a field";
            },
            // handleChange: function() {
            //     this.$emit(this.onChangeFunctionName, this.selected);
            // }
        },
        mounted: function() {
            // Handle a case where the entrySelection value does not exist in dropdownEntries array.
            let reset = true;

            // console.log(this.referenceEntries);

            for (var i = 0; i < this.referenceEntries.length; i++) {
                if (this.referenceEntries[i] === this.entrySelection) {
                    reset = false;
                    break;
                }
            }

            console.log("reset: " + reset);

            if (reset) {
                this.resetSelection();
                console.log(this.selected);
                console.log(this.onChangeFunctionName);
                // this.$emit(this.onChangeFunctionName, this.selected);
            }
        },
        template: `
            <div>
                {{ dropdownTitle }}
                <select v-model="selected">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="entry in dropdownEntries" v-bind:value="entry">
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

                // Set new related record selection
                this.computation.displayAppRRField = selection;
                // Set the related app Id from the selected related record.
                this.computation.relatedAppId = selection.referenceTable.relatedApp.app;

                // Set RAFIELD to the related fields from the selected related record
                this.relatedAppDisplayFields = getRelatedAppDisplayFields(selection, this.relatedRecords);
                // Set selected relatedAppTargetField to "".
                this.computation.relatedAppTargetField = "";
                // this.$refs.RAField.resetSelection(); // reset v-model variable

                // Clear calcFuncField and calcFuncFields
                this.computation.calcFuncField = "";
                this.calcFuncFields = {};
                // this.$refs.CFField.resetSelection(); // reset v-model variable for calcfuncField
            },
            handleRAFieldSelection: function(selection) {
                this.computation.relatedAppTargetField = selection;
                this.calcFuncFields = getCalcFuncFields(selection, this.calcFunctions);
                this.computation.calcFuncField = "";
                // this.$refs.CFField.resetSelection(); // reset v-model variable for calcfuncField
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
                    v-bind:referenceEntries="this.relatedRecords"
                    v-bind:entrySelection="computation.displayAppRRField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.RRField"
                    @related-records-selected="handleRRSelection"
                    ref="RRField"
                ></optionSelectDropdown>

                <!--
                <div v-if="this.computation.displayAppRRField">
                    <optionSelectDropdown
                        dropdown-name="RAField"
                        v-bind:dropdown-title="this.dropdownTitles.RAField"
                        v-bind:dropdownEntries="this.relatedAppDisplayFields"
                        v-bind:entrySelection="computation.relatedAppTargetField"
                        v-bind:onChangeFunctionName="this.onChangeFunctionNames.RAField"
                        @related-app-field-selected="handleRAFieldSelection"
                        ref="RAField"
                    ></optionSelectDropdown>
                </div>

                <div v-if="this.computation.relatedAppTargetField">
                    <optionSelectDropdown
                        dropdown-name="CFField"
                        v-bind:dropdown-title="this.dropdownTitles.CFField"
                        v-bind:dropdownEntries="this.calcFuncFields"
                        v-bind:entrySelection="computation.calcFuncField"
                        v-bind:onChangeFunctionName="this.onChangeFunctionNames.CFField"
                        @calc-func-selected="handleCalcFuncSelection"
                        ref="CFField"
                    ></optionSelectDropdown>
                </div>

                <optionSelectDropdown
                    dropdown-name="OField"
                    v-bind:dropdown-title="this.dropdownTitles.OField"
                    v-bind:dropdownEntries="this.outputFields"
                    v-bind:entrySelection="computation.outputField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.OField"
                    @output-field-selected="handleOutputFieldCodeSelection"
                ></optionSelectDropdown>
                -->
            </div>
        `
    });

    // todo: public function to clear selections based on component passed in.

    // Vue root instance
    let vm = new Vue({
        data: data,
        el: "#plugin",
        created: function() {
            if (this.computations.length === 0) {
                this.handleAddComputation(0);
            }

            console.log("created vm related records: ");
            console.log(this.relatedRecords);
        },
        beforeMount: function() {
            console.log("beforeMount vm related records: ");
            console.log(this.relatedRecords);
        },
        mounted: function() {
            console.log("mounted vm related records: ");
            console.log(this.relatedRecords);
        },
        updated: function() {
            console.log("updated vm related records: ");
            console.log(this.relatedRecords);
        },
        beforeUpdate: function() {
            console.log("beforeUpdate vm related records: ");
            console.log(this.relatedRecords);
        },
        beforeDestory: function() {
            console.log("beforeDestroy vm related records: ");
            console.log(this.relatedRecords);
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
            },
            cancelPluginSettings: function() {
                try {
                    kintone.plugin.app.setConfig(CONFIG);
                } catch (error) {
                    console.error(error.message);
                    alart(error.message);
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
                <button @click="savePluginSettings">Save</button>
                <button @click="cancelPluginSettings">Cancel</button>
            </div>
        `
    });

})(kintone.$PLUGIN_ID);

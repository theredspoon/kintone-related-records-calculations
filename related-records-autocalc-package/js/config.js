(function(PLUGIN_ID) {
    "use strict";

    // Get previous settings from kintone app
    var CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);

    // TODO: pass CONFIG into <select> options to prepopulate
    // before making API call to update any field changes

    let previouslySavedComputations = rehydrateComputations(CONFIG);

    var data = {
        "calcFunctions": {
            "num": NUMCALCFUNCTIONS,
            "text": TEXTCALCFUNCTIONS
        },
        "formFields": {},
        "relatedRecords": previouslySavedComputations.map(comp => comp.displayAppRRField) || [],
        "outputFields": previouslySavedComputations.map(comp => comp.outputField) || [],
        "counter": previouslySavedComputations.length || 0,
        "computations": previouslySavedComputations || [],
        "fullyLoaded": false
    };

    setConfigFields(data)

    // This vue component includes a label, dropdown, and displays the previusly selected option in case of an error
    Vue.component('optionSelectDropdown', {
        props: [
            "dropdownName",
            "dropdownTitle",
            "onChangeFunctionName",
            "dropdownEntries",
            "entrySelection",
            "previouslySelected"
        ],
        data: function() {
            return {

                selected: this.entrySelection != null ? this.entrySelection : ""
            }
        },
        methods: {
            resetSelection: function() {
                this.selected = "";
            },
            handleChange: function() {
                this.$emit(this.onChangeFunctionName, this.selected);
            }
        },
        watch: {
            entrySelection: function (selection) {
                this.selected = this.entrySelection != null ? this.entrySelection : "";
            }
        },
        template: `
            <div>
                {{ dropdownTitle }}
                <select v-model="selected" @change="handleChange">
                    <option disabled value="">Select a field</option>
                    <option v-for="entry in dropdownEntries" v-bind:value="entry">
                        <span v-if="entry.code != null">{{entry.label}}:{{ entry.code }}</span>
                        <span v-else>{{ entry.name }}</span>
                    </option>
                </select>
                <span v-if="previouslySelected" style="color: red">
                    <span v-if="this.dropdownName === 'CFField'">
                        Previously Selected: {{ this.previouslySelected.name }} : {{ this.previouslySelected.fn }}
                    </span>
                    <span v-else>
                        Previously Selected: {{ this.previouslySelected.label }} : {{ this.previouslySelected.code }}
                    </span>
                </span>
            </div>
        `
    });

    // This vue component manages one computation's data
    Vue.component("computationItem", {
        props: [
            "calcFunctions",
            "formFields",
            "relatedRecords",
            "outputFields",
            "computation",
            "index",
            "length"
        ],
        data: function() {
            return {
                "relatedAppDisplayFields": this.computation.displayAppRRField != null ? getRelatedAppDisplayFields(this.computation.displayAppRRField, this.relatedRecords) : [],
                "calcFuncFields": this.computation.relatedAppTargetField != null ? getCalcFuncFields(this.computation.relatedAppTargetField, this.calcFunctions) : [],
                dropdownTitles: {
                    RRField: "Related Record Field:",
                    RAField: "Field in Related Record:",
                    CFField: "Calcuation on Field:",
                    OField: "Output Calculation to Field:"
                },
                onChangeFunctionNames: {
                    RRField: "related-records-selected",
                    RAField: "related-app-field-selected",
                    CFField: "calc-func-selected",
                    OField: "output-field-selected"
                },

                /*
                    If the currently selected entries in compution to be passed into optionSelectDropdown are not valid anymore,
                    Save those curently selected entires in here for safe keeping, and then display them in optionSelectDropdown
                    as the previusly selected entry to help users to figure out what entries to select again for each optionSelectDrodpown.
                */
                errorPreviousSelections: {
                    RRField: null,
                    RAField: null,
                    CFField: null,
                    OField: null
                }
            };
        },

        // Runs rights before the component is attached to the DOM
        mounted: function() {

            // Check if the data is fully loaded
            if (!data.fullyLoaded) {
                console.error("computationItem mounted before data variable was fully loaded.")
            }

            // Error check all fields to ensure that their field_code still exists in the app (except for calcFuncations)
            // Error check RRField
            if (this.errorsInField(this.relatedRecords, this.computation.displayAppRRField)) {

                // Save RRField value, RAField, and CFField values
                this.errorPreviousSelections.RRField = this.computation.displayAppRRField;
                this.errorPreviousSelections.RAField = this.computation.relatedAppTargetField;
                this.errorPreviousSelections.CFField = this.computation.calcFuncField;

                // Clear previously saved RRField entry selection in compuation
                this.computation.displayAppRRField = "";

                // Also reset the other fields
                this.computation.relatedAppTargetField = "";
                this.computation.calcFuncField = "";
            }

            // Error check RAField
            if (this.relatedAppDisplayFields) {
                if (this.errorsInField(this.relatedAppDisplayFields, this.computation.relatedAppTargetField)) {

                    // Save RAField value and CFField value
                    this.errorPreviousSelections.RAField = this.computation.relatedAppTargetField;
                    this.errorPreviousSelections.CFField = this.computation.calcFuncField;

                    // Clear previously saved RAField entry selection in compuation
                    this.computation.relatedAppTargetField = "";
                    this.computation.calcFuncField = "";
                }
            }
            
            // Error check OField
            if (this.errorsInField(this.outputFields, this.computation.outputField)) {

                // Save OField value
                this.errorPreviousSelections.OField = this.computation.outputField;

                // Clear previously saved OField entry selection in compuation
                this.computation.outputField = "";
            }
        },
        methods: {
            
            /*
                Given a collection of "entries" for a dropdown and the previuslySelected entry that was saved
                Figure out if the previouslySelected entry still exists in the collection.
                Error if previouslySelected can't be found, other wise no error.
            */
            errorsInField(fieldEntries, previouslySelected) {

                // Todo: if we ca iterate through an array with the for (var ... in ...) technique, then we can remove the
                // if else statement and everything in the if (Array.isArray(fieldEntries) code block.

                // Is fieldEntries an array?
                if (Array.isArray(fieldEntries)) {

                    // Iterate through the array and compare each object with previouslySelected
                    for (var i = 0; i < fieldEntries.length; i++) {

                        // If previouslySelected is equal to the object in the array, return false for no error
                        if(fieldEntries[i].label == previouslySelected.label && fieldEntries[i].code == previouslySelected.code) {
                            return false;
                        }
                    }
                } else {

                    // Iterate through the objects opererties and compare each property with previouslySelected
                    for (var property in this.fieldEntries) {

                        // If previouslySelected is equal to the object in the array, return false for no error
                        if(property.label == previouslySelected.label && property.code == previouslySelected.code) {
                            return false;
                        }
                    }
                }

                return true;
            },
            handleRRSelection: function(selection) {

                // Set new related record selection
                this.computation.displayAppRRField = selection;
                // Set the related app Id from the selected related record.
                this.computation.relatedAppId = selection.referenceTable.relatedApp.app;

                // Calculate the dropdownEntries for RAField based on the RRField entry selection
                this.relatedAppDisplayFields = getRelatedAppDisplayFields(selection, this.relatedRecords);
                // Set selected relatedAppTargetField to "".
                this.computation.relatedAppTargetField = "";
                this.$refs.RAField.resetSelection(); // reset v-model variable

                // Clear calcFuncField and calcFuncFields
                this.computation.calcFuncField = "";
                this.calcFuncFields = {};
                this.$refs.CFField.resetSelection(); // reset v-model variable for calcfuncField
            },
            handleRAFieldSelection: function(selection) {
                this.computation.relatedAppTargetField = selection;
                this.calcFuncFields = getCalcFuncFields(selection, this.calcFunctions);
                this.computation.calcFuncField = "";
                this.$refs.CFField.resetSelection(); // reset v-model variable for calcfuncField
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
                    v-bind:entrySelection="computation.displayAppRRField"
                    v-bind:previouslySelected="this.errorPreviousSelections.RRField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.RRField"
                    @related-records-selected="handleRRSelection"
                    ref="RRField"
                />
                
                <optionSelectDropdown
                    dropdown-name="RAField"
                    v-bind:dropdown-title="this.dropdownTitles.RAField"
                    v-bind:dropdownEntries="this.relatedAppDisplayFields"
                    v-bind:entrySelection="computation.relatedAppTargetField"
                    v-bind:previouslySelected="this.errorPreviousSelections.RAField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.RAField"
                    @related-app-field-selected="handleRAFieldSelection"
                    ref="RAField"
                />

                <optionSelectDropdown
                    dropdown-name="CFField"
                    v-bind:dropdown-title="this.dropdownTitles.CFField"
                    v-bind:dropdownEntries="this.calcFuncFields"
                    v-bind:entrySelection="computation.calcFuncField"
                    v-bind:previouslySelected="this.errorPreviousSelections.CFField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.CFField"
                    @calc-func-selected="handleCalcFuncSelection"
                    ref="CFField"
                />

                <optionSelectDropdown
                    dropdown-name="OField"
                    v-bind:dropdown-title="this.dropdownTitles.OField"
                    v-bind:dropdownEntries="this.outputFields"
                    v-bind:entrySelection="computation.outputField"
                    v-bind:previouslySelected="this.errorPreviousSelections.OField"
                    v-bind:onChangeFunctionName="this.onChangeFunctionNames.OField"
                    @output-field-selected="handleOutputFieldCodeSelection"
                />
                
            </div>
        `
    });

    // Vue root instance
    let vm = new Vue({
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
            <div v-if="this.fullyLoaded">
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

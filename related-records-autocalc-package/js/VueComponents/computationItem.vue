<template>
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
</template>

<script>
export default {
    name: 'computationItem',
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
    }
}
</script>

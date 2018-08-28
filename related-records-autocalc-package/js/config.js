(function(PLUGIN_ID) {
    "use strict";
    
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
                this.$emit("outputFieldSelected", this.selected)
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

    Vue.component("calcFuncFieldSelect", {
        data: function() {
            return {
                selected: !!this.calcFuncField ? this.calcFuncField : "Select a field"
            };
        },
        methods: {
            handleChange: function() {
                this.$emit("calcFuncFieldSelected", this.selected)
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

    Vue.component("computation", {
        data: function() {
            return {
                "relatedAppDisplayFields": !!this.computation.displayAppRRField ? getRelatedAppDisplayFields(this.computation.displayAppRRField, this.relatedRecords) : "",
                "calcFuncFields": !!this.computation.relatedAppTargetField ? getCalcFuncFields(this.computation.relatedAppTargetField, this.calcFunctions) : ""
            };
        },
        methods: {
            handleRRSelection: function(selection) {
                this.computation.displayAppRRField = selection;
                this.computation.relatedAppId = selection.referenceTable.relatedApp.app;
                this.relatedAppDisplayFields = getRelatedAppDisplayFields(selection, this.relatedRecords);
                this.computation.relatedAppTargetField = "";
                this.calcFuncFields = {};
                this.computation.calcFuncField = "";
            },
            handleRRFieldCodeSelection: function(selection) {
                this.computation.relatedAppTargetField = selection;
                this.calcFuncFields = getCalcFuncFields(selection, this.calcFunctions);
                this.computation.calcFuncField = "";
            },
            handleOutputFieldCodeSelection: function(selection) {
                this.computation.outputField = selection;
            },
            handleCalcFuncFieldSelection: function(selection) {
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
                <relatedRecordsSelect
                    v-bind:relatedRecords="relatedRecords"
                    v-bind:displayAppRRField="computation.displayAppRRField"
                    @relatedRecordsFieldSelected="handleRRSelection"
                ></relatedRecordsSelect>

                <relatedAppFieldCodeSelect
                    v-bind:relatedAppDisplayFields="relatedAppDisplayFields"
                    v-bind:relatedAppTargetField="computation.relatedAppTargetField"
                    @relatedAppFieldCodeSelected="handleRRFieldCodeSelection"
                ></relatedAppFieldCodeSelect>

                <outputFieldSelect
                    v-bind:outputFields="outputFields"
                    v-bind:outputField="computation.outputField"
                    @outputFieldSelected="handleOutputFieldCodeSelection"
                ></outputFieldSelect>

                <calcFuncFieldSelect
                    v-bind:calcFuncFields="calcFuncFields"
                    v-bind:calcFuncField="computation.calcFuncField"
                    @calcFuncFieldSelected="handleCalcFuncFieldSelection"
                ></calcFuncFieldSelect>
            </div>
        `,
        props: [
            "calcFunctions",
            "formFields",
            "relatedRecords",
            "outputFields",
            "computation",
            "index",
            "length"
        ]
    });

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
            <computation
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
            ></computation>
            <button @click="savePluginSettings">SAVE</button>
            </div>
        `
    });

})(kintone.$PLUGIN_ID);

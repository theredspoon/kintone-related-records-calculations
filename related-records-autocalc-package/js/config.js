(function(PLUGIN_ID) {
    "use strict";
    var CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
    console.log('saved config is ', CONFIG);
    var appId = kintone.app.getId();

    // if no initial values are found in config (first time running plugin)
    // then set initial values

    // BELOW LINE IS FOR TESTING ONLY
    // kintone.plugin.app.setConfig({});
    // REMOVE ABOVE AFTER TESTING IS COMPLETE

/*     if (!CONFIG["init"]) {
        kintone.plugin.app.setConfig({
            "init": JSON.stringify(true),
            "calculationFunctions": JSON.stringify(ALLCALCFUNCTIONS),
            "formFields": "",
            "relatedRecords": "",
        });
    } */

    console.log('CONFIG after init is ', CONFIG);

    var data = {
        "calcFunctions": {
            "num": NUMCALCFUNCTIONS,
            "text": TEXTCALCFUNCTIONS
        },
        "formFields": {},
        "relatedRecords": [],
        "calculationOutputFields": [],
        "counter": 0,
        "computations": [] // config settings to pass into customize.js
    };

    setConfigFields(data);
    console.log('data is ', data);

    // Register Vue components (must be done before Vue instantiation)
    Vue.component("relatedRecordsSelect", {
        data: function () {
            return {
                selected: "Select a field"
            }
        },
        methods: {
            handleChange: function () {
                console.log('change handler in relatedRecordsSelect fired');
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
    })

    Vue.component("relatedAppFieldCodeSelect", {
        data: function () {
            return {
                selected: "Select a field"
            }
        },
        methods: {
            handleChange: function () {
                console.log('change handler in relatedAppFieldCodeSelect fired: this.selected is ', this.selected);
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
    })

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
        data: function () {
            return {
                selected: "Select a field"
            }
        },
        methods: {
            handleChange: function () {
                console.log('change handler in outputFieldSelect fired');
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
    })

    Vue.component("calcFieldSelect", {
        data: function () {
            return {
                selected: "Select a field"
            }
        },
        methods: {
            handleChange: function () {
                console.log('change handler in calcFieldSelect fired');
                this.$emit("calcFieldSelected", this.selected)
            }
        },
        template: `
            <div>
                Pick a calculation to use on the target related records field.
                <select v-model="selected" @change="handleChange">
                    <option disabled value="Select a field">Select a field</option>
                    <option v-for="(value, key) in calcFields" v-bind:value="value" :key="key">
                    {{key}}
                    </option>
                </select>
                <span>Selected: {{this.calcField.name}}</span>
            </div>
        `,
        props: ["calcField", "calcFields"]
    })

    Vue.component("computation", {
        data: function () {
            return {
                "displayAppRRField": "", // parent needs to grab this
                "relatedAppDisplayFields": "",
                "relatedAppTargetField": "", // parent needs to grab this
                "outputFields": "",
                "outputField": "", // parent needs to grab this
                "calcFields": "",
                "calcField": "", // parent needs to grab this
                "id": "" 
            }
        },
        methods: {
            handleRRSelection: function (selection) {
                this.displayAppRRField = selection;
                this.relatedAppDisplayFields = getRelatedAppDisplayFields(selection, this.relatedRecords);
                this.relatedAppTargetField = "";
                this.outputFields = {};
                this.outputField = "";
                this.calcFields = {};
                this.calcField = "";
            },
            handleRRFieldCodeSelection: function (selection) {
                this.relatedAppTargetField = selection;
                this.outputFields = getOutputFields(selection, this.calculationOutputFields);
                this.outputField = "";
                this.calcFields = getCalcFields(selection, this.calcFunctions);
                this.calcField = "";
            },
            handleOutputFieldSelection: function (selection) {
                this.outputField = selection;
                console.log('this.outputField is ', selection);
            },
            handleCalcFieldSelection: function (selection) {
                this.calcField = selection;
                console.log('this.calcField is ', selection);
            },
            addNewComputation: function () {
                // add new blank computation to computations array
                console.log('add new computation, index is ', this.index);
                this.$emit("addNewComputation", this.index)
            },
            removeComputation: function () {
                // remove this computation from computations array
                console.log('remove new computation, index is ', this.index);
                this.$emit("removeComputation", this.index)
            }

        },
        template: `
            <div>
                <button @click="addNewComputation">+</button>
                <button v-if="index > 0" @click="removeComputation">-</button>
                <relatedRecordsSelect
                    v-bind:relatedRecords="relatedRecords"
                    v-bind:displayAppRRField="displayAppRRField"
                    @relatedRecordsFieldSelected="handleRRSelection"
                ></relatedRecordsSelect>

                <relatedAppFieldCodeSelect
                    v-bind:relatedAppDisplayFields="relatedAppDisplayFields"
                    v-bind:relatedAppTargetField="relatedAppTargetField"
                    @relatedAppFieldCodeSelected="handleRRFieldCodeSelection"
                ></relatedAppFieldCodeSelect>

                <outputFieldSelect
                    v-bind:outputFields="outputFields"
                    v-bind:outputField="outputField"
                    @outputFieldSelected="handleOutputFieldSelection"
                ></outputFieldSelect>

                <calcFieldSelect
                    v-bind:calcField="calcField"
                    v-bind:calcFields="calcFields"
                    @calcFieldSelected="handleCalcFieldSelection"
                ></calcFieldSelect>
            </div>
        `,
        props: [
            "calcFunctions",
            "formFields",
            "relatedRecords",
            "calculationOutputFields",
            "computation",
            "index"
        ]
    })

    // instantiate Vue
    let vm = new Vue({
        // initial state
        data: data,
        el: "#plugin",
        created: function () {
            this.handleAddComputation(0);
        },
        methods: {
            count: function () {
                this.counter++
                return this.counter;
            },
            handleAddComputation: function (index) {
                let before = this.computations.slice(0, index + 1);
                let after = this.computations.slice(index + 1, this.computations.length);
                this.computations = [...before, {
                    "displayAppRRField": "", // parent needs to grab this
                    "relatedAppDisplayFields": "",
                    "relatedAppTargetField": "", // parent needs to grab this
                    "outputFields": "",
                    "outputField": "", // parent needs to grab this
                    "calcFields": "",
                    "calcField": "",
                    "id": this.count()
                }, ...after];
            },
            handleRemoveComputation: function (index) {
                let before = this.computations.slice(0, index);
                let after = this.computations.slice(index + 1, this.computations.length);
                this.computations = [...before, ...after];
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
                v-bind:key="computation.id"
                v-bind:calcFunctions="calcFunctions"
                v-bind:formFields="formFields"
                v-bind:calculationOutputFields="calculationOutputFields"
                v-bind:relatedRecords="relatedRecords"
            ></computation>
            </div>
        `
    });

    // SAVE SETTINGS
    // kintone.plugin.app.setConfig(JSON.stringify(CONFIG.assign(data));  
})(kintone.$PLUGIN_ID);

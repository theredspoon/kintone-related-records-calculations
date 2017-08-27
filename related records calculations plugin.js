"use strict"
/*
A plugin to run some kind of calculation [SUM?] on a field with numbers
across related records, and present the result of that calculation
in a field.

Number -> Number
*/

/* Tests
1) New record is added
2) Old record is edited with target field increasing (5 -> 20)
3) Old record is edited with target field decreasing (10 -> 5)
4) record is deleted
5) record is deleted, 3 new records are added
6) the only thing done since the last successful sync was a deletion of record 904002

Q: What field are we getting the number from?
A: Number, Calculated, Drop-down, Radio Button

Q: How do you want to handle type conversion?
A: with isNaN checks and checks to thousands separators...
is a check for large/signed/unsigned/hex codes needed?
reference this: https://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number

Q: How do you want to handle permissions (datasource app & display app)?
A:

Q: In what app do you want to do the calculation (datasource or display app)?
A: Reframed, is this a push or a pull?

Q: What are the advantages/disadvantages of running the calc in datasource app?
A: Advantages are - if permissions are set right, calc autoupdates
Disadvantages are - IF permissions are set right

Q: What are the advantages/disadvantages of running the calc in display app?
A: Advantages are - ostensibly no permissions problems
Disadvantages are - running the calc on the record list possibly
brings views into the mix

Q: Do you want the user to initiate the calculation?
A: ideally, the calculation should run without user input and simply
present the result in a field

Q: When should the calculation run?
A: 
1) the first time we enter the record list view of the display app
after the plugin is installed, calculate for every record in the
display app
app.record.index.show + mobile.app.record.index.show
2) when inside the record details view, calculate for that record
app.record.detail.show + mobile.app.record.detail.show
3) when saving a record inline edit inside the record list view,
calculate for that record
app.record.index.edit.submit
4) when the "save" button is clicked in a new record (desktop + mob),
calculate for that record
app.record.create.submit + mobile.app.record.create.submit
5) whenever the "Recalculate Totals" button is pressed, calculate for
every record in the display app: https://developer.kintone.io/hc/en-us/articles/213149437/

Q: What calculations do you want to support?
A: SUM
*/

/*
Requirements:
1) An interface to:
 -- identify the field holding the value of the calculation
 -- date checks to see if additional API calls are needed
 -- 
*/

// signature
// purpose
// tests
// stub

// Possible Approach #1
    // plugin interface:
        // for a given calculation:
            // relatedRecordsFieldCode: identify which related records field in the display app (field code RR_1, RR_2...)
            // identify datasource app
            // last captured update for datasource app (default to null)
            // targetFieldCode: field to traverse records in datasource app to run calc on
            // outputFieldCode: field in display app to output calc into


    // when in the list view of the display app, which is
    // [record list onload desktop and mobile]: app.record.index.show and
    // (mobile.app.record.index.show) 

        // make an API CALL to check if the timestamp of the most recently
        // created or updated record in the datasource app is after the last
        // time this code was run [[doesn't handle deleted records]]

        // [[also handle permissions???]]
        // if we have permissions to manage the datasource app (assuming this is needed) 

            // if datasource app has been updated since the last time we checked
            // or if we never checked:

                // API CALL to retrieve a record list from the datasource app,
                // ordered by desc and including only those new (CreatedAt) or newly updated (updatedAt) records
                // what about deleted records???????

                // for each record in display app, run a function called makeCalc() that

                    // save value of output field

                    // apply that record's related records filter to the datasource app record list [supports dynamic filtering]
                
                    // run the desired calculation across filtered records
                        // if the filtered record is new:
                            //

                        // if the filtered record is updated:
                            // make a correction
                
                    //  add the value of the calculation to the output field [WRONG]

        // prevent editing of output field
        // https://developer.kintone.io/hc/en-us/articles/115003639467
# DHIS-Zero-Plugin
This is a web plugin that was built to prefill a particular dhis table with zero.
The problem it solves is that it avoids the manual entry of zero into over 5325 cells iteratively.

# How it works 

It uses vanilla javascript to: 
- Number the tables and rows.
- Collect tables and rows to be filled with zeros and send to the Javascript context of the DHIS page.
- Fill the tables and corresponding rows with zeros by running a custom defined function that accepts table and rows arrays as parameters.
- The function also measures the browser memory consumption and adjusts the load as needed. It trys to keep as close to O(1) as possible
- The user interface consists of the table names and automatically generates row mappings through a static object reference.
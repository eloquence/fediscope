// Part of https://github.com/eloquence/fediscope. Public domain: https://creativecommons.org/share-your-work/public-domain/cc0/

// Folks who don't want to be discoverable. Accepts https://wikidata.org/entity/Q-number URLs.
const denyList = [];

// Load the professions from the JSON file
fetch("filtered-professions.json")
    .then((response) => response.json())
    .then((professions) => {
        // Sort the professions alphabetically by itemLabel
        professions.sort((a, b) => a.itemLabel.localeCompare(b.itemLabel));

        // Get the select element
        const select = document.getElementById("profession-select");

        // Clear the loading option
        select.innerHTML = "";

        const seen = [];
        // Add the professions as options to the select element
        for (const profession of professions) {
            if (!seen.includes(profession.itemLabel)) {
                const option = document.createElement("option");
                option.value = profession.item;
                option.textContent = `${profession.itemLabel} (${profession.count})`;
                if (profession.itemLabel === "journalist") {
                    option.selected = true;
                }
                select.appendChild(option);
            }
            seen.push(profession.itemLabel);
        }
    });


// Get the dropdown
const dropDown = document.getElementById("profession-select");
dropDown.addEventListener("change", lookup);
// Get the lookup button
const lookupButton = document.getElementById("lookup-button");

// Add a click event listener to the lookup button
lookupButton.addEventListener("click", lookup);

// Look up a profession in Wikidata
function lookup() {

    // We're done loading
    document.getElementById("loading").style.display = "inline";

    // Remove previous results
    const previousResults = document.getElementById("results-table");
    document.getElementById("error").style.display = "none";

    if (previousResults !== null) {
        previousResults.remove();
    }

    const previousDownloadLink = document.getElementById("download-link");

    if (previousDownloadLink !== null) {
        previousDownloadLink.remove();
    }

    // Get the selected profession from the dropdown menu
    const profession = document.getElementById("profession-select").value;

    // Extract the Q number from the Wikidata URL
    const qNumber = profession.slice(profession.lastIndexOf("/") + 1);

    // Set up the SPARQL query
    const query = `
    SELECT DISTINCT ?person ?personLabel ?mastodonName ?pic ?personDescription
    WHERE {
      ?person wdt:P4033 ?mastodonName ;
        wdt:P106 ?occupation .
      OPTIONAL { ?person wdt:P18 ?pic . }
      ?occupation wdt:P279* wd:${qNumber} .
       SERVICE wikibase:label {
         bd:serviceParam wikibase:language "en"
       }
    }`;

    // Encode the query for use in a URL
    const encodedQuery = encodeURIComponent(query);

    document.getElementById("profession-select").setAttribute("disabled", true);
    document.getElementById("lookup-button").setAttribute("disabled", true);

    // Make a request to the Wikidata query endpoint
    fetch(`https://query.wikidata.org/sparql?format=json&query=${encodedQuery}`)
        .then(response => {
            if (response.status == 200) {
                return response.json();
            } else {
                document.getElementById("error").style.display = "inline";
                return null;
            }
        })
        .then(data => {
            document.getElementById("loading").style.display = "none";
            document.getElementById("profession-select").removeAttribute("disabled");
            document.getElementById("lookup-button").removeAttribute("disabled");

            if (data !== null) {
                // Process the query results here
                displayResults(data);
            }
        })
        .catch(error => {
            document.getElementById("loading").style.display = "none";
            document.getElementById("error").style.display = "inline";
            document.getElementById("profession-select").removeAttribute("disabled");
            document.getElementById("lookup-button").removeAttribute("disabled");
            console.error(error);
        });
}

function displayResults(data) {
    // Get the results bindings
    const bindings = data.results.bindings;

    // Create a table element
    const table = document.createElement("table");
    table.setAttribute("id", "results-table");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("cellpadding", "0");


    const seenAddress = [];
    // Add a table row for each result binding
    for (const binding of bindings) {
        // Skip rows from the deny-list
        if (isInDenyList(binding)) {
            continue;
        }
        if (binding["mastodonName"]) {
            if (seenAddress.includes(binding['mastodonName'].value))
                continue;
            seenAddress.push(binding["mastodonName"].value);
        }

        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.setAttribute("class", "remove-row");
        removeLink = document.createElement("a");
        removeLink.setAttribute("href", "#");
        removeLink.setAttribute("class", "remove-link");
        removeLink.setAttribute("title", "Remove from table and CSV export");
        removeLink.innerHTML = "&#10006;";
        removeLink.addEventListener("click", function(event) {
            this.parentNode.parentNode.remove();
            // We need to regenerate the download link to reflect the changed table data
            document.getElementById("download-link").remove();
            addDownloadLink();
            // We don't want to scroll around, so we suppress the regular link behavior
            event.preventDefault();
        });
        td.appendChild(removeLink);
        tr.appendChild(td);

        // Add a table cell for each variable
        for (const variable of ["personLabel", "mastodonName", "personDescription", "pic"]) {
            const td = document.createElement("td");
            if (variable === "mastodonName") {
                td.setAttribute("class", "account");
                // Create a clickable link for the Mastodon username
                const a = document.createElement("a");
                a.href = getMastodonUrl(binding[variable].value);
                a.setAttribute("target", "_blank");
                a.textContent = binding[variable].value;
                td.appendChild(a);
            } else if (variable === "pic") {
                td.setAttribute("class", "picture");
                if (binding[variable]) {
                    const a = document.createElement("a");
                    a.href = getFilePage(binding[variable].value);
                    a.setAttribute("target", "_blank");
                    a.setAttribute("title", "Click for attribution and larger sizes");
                    a.appendChild(getImage(binding[variable].value));
                    td.appendChild(a);
                }
            } else if (variable === "personLabel") {
                td.setAttribute("class", "name");
                if (binding[variable]) {
                    const a = document.createElement("a");
                    a.href = getHttpsUrl(binding["person"].value);
                    a.setAttribute("title", "Click to view on Wikidata");
                    a.setAttribute("target", "_blank");
                    a.textContent = binding[variable].value;
                    td.appendChild(a);
                }
            } else if (variable === "personDescription") {
                td.setAttribute("class", "description");
                if (binding[variable]) {
                    td.textContent = binding[variable].value;
                }
            }
            tr.appendChild(td);

        }
        // Add the table row to the table
        table.appendChild(tr);
    }
    // Append the table to the body of the document
    document.body.appendChild(table);
    addDownloadLink();
}

function getImage(url) {
    // Create an image element
    const img = document.createElement("img");

    // Set the src attribute to the thumbnail URL
    img.src = `https://commons.wikimedia.org/w/thumb.php?f=${url.slice(url.lastIndexOf("/") + 1)}&w=250`;

    return img;
}

function getFilePage(url) {
    url = getHttpsUrl(url);
    return url.replace("Special:FilePath/", "File:");
}

function getMastodonUrl(username) {
    // Strip leading @ (sometimes present)
    username = username.replace(/^@/, "");
    return `https://${username.split("@")[1]}/@${username.split("@")[0]}`;
}

function addDownloadLink() {
    // Get all of the table rows
    const rows = document.querySelectorAll("#results-table tr");

    // Create a string to hold the CSV data
    let csvData = "Account address,Show boosts\n";

    // Loop through the rows
    for (const row of rows) {
        // Get the account address cell and the show boosts cell
        const accountAddressCell = row.querySelector(".account");

        // Add a row to the CSV data string
        csvData += `${accountAddressCell.textContent},true\n`;
    }

    // Create a link element to trigger the download
    const link = document.createElement("a");

    // Set the link's href to a data URL with the CSV data
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;
    link.textContent = "Download CSV";

    // Set the link's download attribute
    link.download = "profiles.csv";
    link.setAttribute("id", "download-link");
    // Append the link to the body of the document
    document.getElementById("download-link-container").appendChild(link);
}

function getHttpsUrl(url) {
    return url.replace(/^http:/, "https:");
}

function toggleDarkMode() {
    const element = document.body;
    element.classList.toggle("dark-mode");
}

function isInDenyList(binding) {
    if (binding['person']) {
        url = getHttpsUrl(binding['person'].value);
        return denyList.includes(url);
    }
    return false;
}
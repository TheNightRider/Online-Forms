function elt(name, attributes) {
    var node = document.createElement(name);
    if (attributes) {
        for (var attr in attributes)
            if (attributes.hasOwnProperty(attr))
                node.setAttribute(attr, attributes[attr]);
    }
    for (var i = 2; i < arguments.length; i++) {
        var child = arguments[i];
        if (typeof child == "string")
            child = document.createTextNode(child);
        node.appendChild(child);
    }
    return node;
}

function generateRow(j, label, type, check) {
    var element = document.createTextNode("Element" + (j + 1));
    var input = elt("input", {placeholder: "Label"});
    if (label)
        input.value = label;
    var divForRadio = elt("div", {style: 'display: none'});
    var selectType = elt("select", null,
        elt("option", {value: "text"}, "TextBox"),
        elt("option", {value: "radio"}, "RadioButton"),
        elt("option", {value: "checkbox"}, "CheckBox")
    );

    var radioNumber = elt("input", {type: "number", min: 1, style: 'display: none'});

    if (typeof label != "undefined" && typeof type != "undefined" && typeof check != "undefined") {
        if (type.type == "radio") {
            selectType.value = "radio";
            radioNumber.value = type.attributes.length;
            for (var i = 0; i < radioNumber.value; i++) {
                var div = elt("div");
                var option = document.createTextNode("Option " + i);
                var optionText = elt("input", {type: "text"});
                optionText.value = type.attributes[i].value;
                div.appendChild(option);
                div.appendChild(optionText);
                divForRadio.appendChild(div);
                radioNumber.style.display = "inline-block";
            }
            divForRadio.style.display = "block";
        } else if (type.type == "text" || type.type == "checkbox") {
            selectType.value = type.type;
        }
    }
    selectType.addEventListener("click", function (event) {
        if (selectType.value == "radio") {
            radioNumber.style.display = "inline-block";
            radioNumber.style.width = 35 + "px";
            divForRadio.style.display = "block";
        }
        else {
            radioNumber.style.display = "none";
            divForRadio.style.display = "none";
        }

    });
    radioNumber.addEventListener("change", function (event) {
        var num = radioNumber.value;

        divForRadio.innerHTML = "";
        for (var i = 1; i <= num; i++) {
            var div = elt("div");
            var option = document.createTextNode("Option " + i);
            var optionText = elt("input", {type: "text"});
            div.appendChild(option);
            div.appendChild(optionText);
            divForRadio.appendChild(div);
        }
    });
    var selectCheck = elt("select", null,
        elt("option", {value: "none"}, "None"),
        elt("option", {value: "number"}, "Number"),
        elt("option", {value: "mandatory"}, "Mandatory")
    );
    if (check)
        selectCheck.value = check;
    return [element, input, selectType, radioNumber, selectCheck, divForRadio];
}

var formName = elt("input");
var search = elt("input", {type: "button", value: "search"});
var save = elt("input", {type: "submit", style: 'display: block'});
var div = elt("div");
var add = elt("input", {type: "button", value: "add"});
var version = elt("input", {width: "30px"});
var rows = [], i = 0, ver = 1;

function showRow(parent, row) {
    var div = document.createElement("div");
    try {
        row.forEach(function (element) {
            div.appendChild(element);
        });
    } catch (e) {
        console.log("row", row);
    }
    div.appendChild(add);
    parent.appendChild(div);
}

function adminStart(parent) {
    parent.innerHTML = "";
    var row = generateRow(i);
    rows.push(row);
    showRow(parent, row);
    parent.appendChild(save);
    add.addEventListener("click", function (event) {
        parent.removeChild(save);
        i++;
        var row = generateRow(i);
        rows.push(row);
        showRow(parent, row);
        parent.appendChild(save);
    });
}

function computeRowForDB(row) {
    var output = {};
    //console.log("computeRowForDB row", row);
    output.label = row[1].value;
    if (row[2].value == "text") {
        output.type = {
            type: "text",
            values: [],
            name: row[1].value,
            version: []
        };
    } else if (row[2].value == "radio") {
        output.type = {
            type: "radio",
            version: [],
            attributes: [],
            values: []
        };
        var options = row[5].querySelectorAll("input");
        for (var i = 0; i < options.length; i++) {
            var radio = {
                name: row[1].value.toLowerCase(),
                value: options[i].value,
                checked: false
            };
            output.type.attributes.push(radio);
        }
    } else if (row[2].value == "checkbox") {
        output.type = {
            type: "checkbox",
            value: row[1].value,
            name: row[1].value.toLowerCase(),
            checked: [],
            version: []
        };
    }
    output.check = row[4].value;
    return output;
}

var db;
const DB_NAME = "db1";
const DB_STORE_NAME = "fields";

function openDB() {
    console.log("openDB..");
    var req = indexedDB.open(DB_NAME);

    req.onsuccess = function (event) {
        db = this.result;
        console.log("openDB Done");
    };
    req.onerror = function (event) {
        console.log(event.target);
        console.log("openDB:", event.target.errorCode);
    };

    req.onupgradeneeded = function (event) {
        console.log("openDB.onupgradeneeded");
        var store = event.currentTarget.result.createObjectStore(
            DB_STORE_NAME, {keyPath: 'formName'});
        store.createIndex("formElements", "formElements", {unique: false});
    }
}

function getObjectStore(store_name, mode) {
    //console.log(db);
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}

function addFields(dbObject) {
    //console.log("addFields arguments:", arguments);
    var store = getObjectStore(DB_STORE_NAME, "readwrite");
    var req;
    req = store.get(dbObject.formName);
    req.onsuccess = function (event) {
        var requestUpdate = store.put(dbObject);
        requestUpdate.onerror = function (event) {
            console.error("addFields, failed to update data");
        };
        requestUpdate.onsuccess = function (event) {
            console.log("Success - the data is updated!");
        }
    };
    req.onerror = function (event) {
        req = store.add(dbObject);
        req.onsuccess = function (event) {
            console.log("Insertion in DB successful");
        };
        req.onerror = function () {
            console.error("addFIelds error", this.error);
        };
    };
}

function displayForms(name, ver) {
    console.log("displayForms");
    store = getObjectStore(DB_STORE_NAME, "readonly");

    var req;
    req = store.get(name);
    req.onsuccess = function (event) {
        try {
            div.innerHTML = "";
            var values = event.target.result.formElements;
            values.forEach(function (value) {
                appendDataToHTML(value, ver);
            });
            document.body.appendChild(save);
        } catch (e) {
            console.log("displayForms error", e);
        }
    };
    req.onerror = function (event) {
        console.log("displayForms error", this.error);
    };
}

function saveForms(rows, name, ver) {
    console.log("saveForms..");
    store = getObjectStore(DB_STORE_NAME, "readwrite");
    var req;
    req = store.get(name);
    req.onsuccess = function (event) {
        var values = event.target.result.formElements;
        values.forEach(function (value, j) {
            var index = value.type.version.indexOf(ver);
            var row = rows[j];
            if (index > -1) {
                if (value.type.type == "text")
                    value.type.values[index] = row.value;
                if (value.type.type == "checkbox")
                    value.type.checked[index] = row.checked;
                if (value.type.type == "radio")
                    value.type.values[index] = row;
            } else {
                if (value.type.type == "text") {
                    value.type.values.push(row.value);
                    value.type.version.push(ver);
                }
                if (value.type.type == "checkbox") {
                    value.type.checked.push(row.checked);
                    value.type.version.push(ver);
                }
                if (value.type.type == "radio") {
                    value.type.values.push(row);
                    value.type.version.push(ver);
                }
            }
        });
        var dbData = event.target.result;
        dbData.formElements = values;
        var requestUpdate = store.put(dbData);
        requestUpdate.onerror = function (event) {
            console.log("Failed to update");
        };
        requestUpdate.onsuccess = function (event) {
            console.log("Data updated");
        };
    };
}

function displayFileds(name) {
    console.log("displayFields..");
    store = getObjectStore(DB_STORE_NAME, "readonly");
    var req;
    req = store.get(name);
    req.onsuccess = function (event) {
        rows = [];
        div.innerHTML = "";
        var values = event.target.result.formElements;
        values.forEach(function (value, j) {
            var row = generateRowFromDB(value, j);
            rows.push(row);
            showRow(div, row);
        });
        div.appendChild(save);
        i = values.length - 1;
    };
    req.onerror = function (event) {
        console.log("displayFileds error", this.error);
    };
}

openDB();

function generateRowFromDB(value, i) {
    return generateRow(i, value.label, value.type, value.check);
}

function appendDataToHTML(value, ver) {
    var label = document.createTextNode(value.label);
    div.appendChild(label);
    var index = value.type.version.indexOf(ver);
    if (value.type.type == "radio") {
        var radios;
        if (index > -1)
            radios = value.type.values[index];
        else
            radios = value.type.attributes;

        div.innerHTML += "<br>";
        radios.forEach(function (radio) {
            var input = elt("input", {
                type: "radio",
                name: radio.name,
                value: radio.value,
                class: "fields"
            });
            if (radio.checked)
                input.setAttribute("checked", true);
            if (value.check != "none")
                input.className += " " + value.check;

            var context = document.createTextNode(radio.value);
            div.appendChild(input);
            div.appendChild(context);
            div.innerHTML += "<br>"
        });
    } else {
        var input = elt("input", {
            type: value.type.type,
            class: "fields",
            name: value.type.name
        });
        if (index > -1) {
            if (value.type.type == "text")
                input.setAttribute("value", value.type.values[index]);
            if (value.type.type == "checkbox") {
                input.setAttribute("value", value.type.value);
                if (value.type.checked[index])
                    input.setAttribute("checked", true);
            }
        }
        if (value.check != "none")
            input.className += " " + value.check;
        div.appendChild(input);
        div.innerHTML += "<br>";
    }
}

save.addEventListener("click", function (event) {
    if (formName.value) {
        var admin = document.getElementById("admin");
        var forms = document.getElementById("forms");
        if (admin.disabled) {
            var dbData = {};
            dbData.formName = formName.value;
            dbData.formElements = [];
            for (var j = 0; j < rows.length; j++) {
                var row = computeRowForDB(rows[j]);
                dbData.formElements.push(row);
            }
            addFields(dbData);
        }
        if (forms.disabled) {
            if (version.value) {
                var fields = checkInputData();
                if (fields.length > 0)
                    saveForms(fields, formName.value, version.value);
            } else
                alert("What version?");
        }
    } else {
        alert("Can't save unnamed form");
    }
});

function checkInputData() {
    var rows = [];
    var status = true;
    var fields = document.querySelectorAll(".fields");
    var radio = [];
    var status = true;
    fields.forEach(function (field, i) {
        if (field.type == "text") {
            if (field.className == "fields mandatory") {
                if (!field.value) {
                    alert(field.name + " can not be empty");
                    status = false;
                }
            } else if (field.className == "fields number") {
                if (isNaN(field.value)) {
                    alert(field.name + " must be number");
                    status = false;
                }
            }
            rows.push({value: field.value});
        } else if (field.type == "checkbox") {
            if (field.className == "fields mandatory") {
                if (!field.checked) {
                    alert(field.name + " must be checked");
                    status = false;
                }
            }
            rows.push({checked: field.checked});
        } else if (field.type == "radio") {
            radio.push({
                name: field.name,
                value: field.value,
                checked: field.checked
            });
            if (typeof fields[i + 1] == "undefined" || (fields[i + 1].type != "radio")) {
                rows.push(radio);
                radio = [];
            }
        }
    });
    if (!status)
        rows = [];
    return rows;
}

search.addEventListener("click", function (event) {
    if (formName.value) {
        var admin = document.getElementById("admin");
        var forms = document.getElementById("forms");
        if (admin.disabled)
            displayFileds(formName.value);
        if (forms.disabled)
            displayForms(formName.value, version.value);
    } else {
        showAdmin();
    }
});

function showAdmin() {
    i = 0;
    rows = [];
    var admin = document.getElementById("admin");
    var forms = document.getElementById("forms");
    document.body.innerHTML = "";
    var div1 = elt("div");
    div1.appendChild(admin);
    div1.appendChild(forms);
    document.body.appendChild(div1);

    admin.disabled = true;
    forms.disabled = false;

    document.body.appendChild(formName);
    document.body.appendChild(search);
    document.body.appendChild(div);
    document.body.appendChild(save);
    add = elt("input", {type: "button", value: "add"});
    adminStart(div);
}

function showForms() {
    var admin = document.getElementById("admin");
    var forms = document.getElementById("forms");
    div.innerHTML = "";
    document.body.innerHTML = "";

    var div1 = elt("div");
    div1.appendChild(admin);
    div1.appendChild(forms);
    document.body.appendChild(div1);

    admin.disabled = false;
    forms.disabled = true;
    var div1 = elt("div");
    div1.appendChild(document.createTextNode("Form name: "));
    div1.appendChild(formName);
    div1.appendChild(document.createTextNode("Version: "));
    div1.appendChild(version);
    div1.appendChild(search);
    document.body.appendChild(div1);
    document.body.appendChild(div);
}
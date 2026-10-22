export class ExpenseManager {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem("expenses")) || [];
        this.budget = Number(localStorage.getItem("budget")) || 0;
    }

    save() {
        localStorage.setItem("expenses", JSON.stringify(this.expenses));
        localStorage.setItem("budget", this.budget);
    }

    add(name, amount, category, date) {
        this.expenses.push({ id: Date.now(), name: name.trim(), amount: Number(amount), category, date });
        this.save();
    }
    

    remove(id) {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.save();
    }

    clearAll() {            
        this.expenses = [];
        this.save();
    }

    replaceAll(list) {
        this.expenses = list;
        this.save();
    }

    setBudget(value) {
        this.budget = Number(value);
        this.save();
    }

    // search + filter + sort
    getVisible(text, category, sort) {
        const list = this.expenses.filter(e =>
            e.name.toLowerCase().includes(text.toLowerCase()) &&
            (category === "All" || e.category === category)
        );
        list.sort((a, b) => sort === "new" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
        return list;
    }

    // current month only, like "2026-10"
    monthList() {
        const now = new Date();
        const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
        return this.expenses.filter(e => e.date.startsWith(month));
    }

    monthTotal() {
        return this.monthList().reduce((sum, e) => sum + e.amount, 0);
    }

    remaining() {
        return this.budget - this.monthTotal();
    }
}



const manager = new ExpenseManager();
let usdRate = null;
const $ = id => document.getElementById(id);
const rupees = n => "₹" + n.toFixed(2);


function render() {
    const spent = manager.monthTotal();
    $("spent").textContent = rupees(spent);
    $("count").textContent = manager.monthList().length;
    $("remaining").textContent = rupees(manager.remaining());
   
    $("warning").textContent = manager.budget > 0 && spent > manager.budget
        ? "Warning: monthly budget exceeded!" : "";

    let html = "";
    for (const e of manager.getVisible($("search").value, $("filter").value, $("sort").value)) {
        html += `<tr><td>${e.date}</td><td>${e.name}</td><td>${e.category}</td>
             <td>${rupees(e.amount)}</td>
             <td><button data-id="${e.id}">Delete</button></td></tr>`;
    }
    $("rows").innerHTML = html;
}


function validate(name, amount, category, date) {
    if (!/^[A-Za-z0-9 ]{2,50}$/.test(name.trim())) return "Name: 2-50 letters or numbers.";
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return "Amount must be above 0.";
    if (!category) return "Choose a category.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Pick a date.";
    return "";   // empty = no error
}


$("addBtn").onclick = () => {
    const error = validate($("name").value, $("amount").value, $("category").value, $("date").value);
    $("error").textContent = error;
    if (error) return;
    manager.add($("name").value, $("amount").value, $("category").value, $("date").value);
    $("name").value = "";
    $("amount").value = "";
    render();
};

$("budgetBtn").onclick = () => {
    if (!/^\d+(\.\d{1,2})?$/.test($("budget").value)) return alert("Enter a valid budget.");
    manager.setBudget($("budget").value);
    render();
};

$("search").oninput = render;
$("filter").onchange = render;
$("sort").onchange = render;

$("rows").onclick = e => {
    if (e.target.dataset.id) {
        manager.remove(Number(e.target.dataset.id));
        render();
    }
};

$("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(manager.expenses, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "expenses.json";
    link.click();
};

$("importFile").onchange = async e => {
    try {
        const data = JSON.parse(await e.target.files[0].text());
        const ok = Array.isArray(data) && data.every(x =>
            x.id !== undefined && typeof x.amount === "number" && x.amount > 0 &&
            typeof x.name === "string" && ["Food", "Travel", "Shopping", "Other"].includes(x.category) &&
            /^\d{4}-\d{2}-\d{2}$/.test(x.date));
        if (!ok) alert("Invalid file: needs a list of {id, name, amount, category, date}.");
        else if (confirm("Replace all expenses with " + data.length + " imported ones?")) {
            manager.replaceAll(data);
            render();
        }
    } catch (err) {
        alert("That file is not valid JSON.");
    }
    e.target.value = "";
};

$("clearBtn").onclick = () => {
    if (confirm("Delete ALL expenses? Budget will be kept.")) {
        manager.clearAll();
        render();
    }
};

async function loadRate() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/INR");
        usdRate = (await res.json()).rates.USD;
    } catch (err) {
        console.log("No exchange rate:", err);
    }
    render();
}


$("date").value = new Date().toISOString().slice(0, 10);
$("budget").value = manager.budget || "";
render();
loadRate();
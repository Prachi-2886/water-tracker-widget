import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTecz188T94RYZ8gBb_Fw9zNDN4g5gyvo",
  authDomain: "prachuu-water-tracker.firebaseapp.com",
  projectId: "prachuu-water-tracker",
  storageBucket: "prachuu-water-tracker.firebasestorage.app",
  messagingSenderId: "14042922344",
  appId: "1:14042922344:web:190cc14f99c06999f3eadd",
  measurementId: "G-LS7D01MRE8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

signInAnonymously(auth);

const maxCups = 14;
let cups1 = 0, cups2 = 0;
const today = () => new Date().toISOString().split("T")[0];

function updateUI() {
  document.getElementById("progress1").textContent = `${cups1} / ${maxCups} glasses`;
  document.getElementById("progress2").textContent = `${cups2} / ${maxCups} glasses`;

  const plant1 = document.getElementById("plant1");
  plant1.textContent = cups1 <= 1 ? "🌱" : cups1 <= 4 ? "🌿" : cups1 <= 10 ? "🌳" : "🌸";
  plant1.classList.add("grow");
  setTimeout(() => plant1.classList.remove("grow"), 300);

  const plant2 = document.getElementById("plant2");
  plant2.textContent = cups2 <= 1 ? "🌱" : cups2 <= 4 ? "🌿" : cups2 <= 10 ? "🌳" : "🌸";
  plant2.classList.add("grow");
  setTimeout(() => plant2.classList.remove("grow"), 300);
}

async function loadCounts() {
  const pSnap = await getDoc(doc(db, "users", "prachuu", "water", today()));
  const aSnap = await getDoc(doc(db, "users", "aaryann", "water", today()));
  cups1 = pSnap.exists() ? pSnap.data().count : 0;
  cups2 = aSnap.exists() ? aSnap.data().count : 0;
  updateUI();
}

async function saveCount(name, count) {
  await setDoc(doc(db, "users", name, "water", today()), { count, date: today() });
}

async function saveHistory() {
  await setDoc(doc(db, "history", today()), {
    date: today(),
    prachuu: cups1,
    aaryann: cups2,
    completedP: Math.round((cups1 / maxCups) * 100),
    completedA: Math.round((cups2 / maxCups) * 100),
    savedAt: new Date().toISOString()
  });
}

async function loadHistory() {
  const snap = await getDocs(query(collection(db, "history"), orderBy("date", "desc")));
  let html = `<thead>
    <tr><th>Date</th><th>Prachuu</th><th>Aaryann</th><th>% P</th><th>% A</th></tr>
  </thead><tbody>`;
  snap.forEach(docSnap => {
    const d = docSnap.data();
    html += `<tr><td>${d.date}</td><td>${d.prachuu}</td><td>${d.aaryann}</td><td>${d.completedP}%</td><td>${d.completedA}%</td></tr>`;
  });
  html += `</tbody>`;
  document.getElementById("historyTable").innerHTML = html;
}

function midnightReset() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1,0,0,2);
  setTimeout(async () => {
    await saveHistory();
    cups1 = cups2 = 0;
    await saveCount("prachuu",0);
    await saveCount("aaryann",0);
    updateUI();
    await loadHistory();
    midnightReset();
  }, next - now);
}

// bubble effect
function createBubble(button) {
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const rect = button.getBoundingClientRect();
  bubble.style.left = rect.left + rect.width / 2 - 6 + window.scrollX + "px"; // center bubble
  bubble.style.top = rect.top - 6 + window.scrollY + "px";
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1000);
}

// BUTTONS
function addPlusMinusListeners(plusId, minusId, cupVarName, name) {
  const plusBtn = document.getElementById(plusId);
  const minusBtn = document.getElementById(minusId);

  plusBtn.addEventListener("click", async (e) => {
    if (cupVarName === "cups1" && cups1 < maxCups) cups1++;
    if (cupVarName === "cups2" && cups2 < maxCups) cups2++;
    updateUI();
    await saveCount(name, cupVarName === "cups1" ? cups1 : cups2);
    createBubble(e.target);
  });

  minusBtn.addEventListener("click", async () => {
    if (cupVarName === "cups1" && cups1 > 0) cups1--;
    if (cupVarName === "cups2" && cups2 > 0) cups2--;
    updateUI();
    await saveCount(name, cupVarName === "cups1" ? cups1 : cups2);
  });
}

addPlusMinusListeners("plus1", "minus1", "cups1", "prachuu");
addPlusMinusListeners("plus2", "minus2", "cups2", "aaryann");


document.getElementById("saveBtn").addEventListener("click", async () => { await saveHistory(); await loadHistory(); });
document.getElementById("saveResetBtn").addEventListener("click", async () => { await saveHistory(); cups1=cups2=0; await saveCount("prachuu",0); await saveCount("aaryann",0); updateUI(); await loadHistory(); });
document.getElementById("historyBtn").addEventListener("click", loadHistory);

onAuthStateChanged(auth, async () => { await loadCounts(); await loadHistory(); midnightReset(); });

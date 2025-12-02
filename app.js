import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- FIREBASE CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyBTecz188T94RYZ8gBb_Fw9zNDN4g5gyvo",
  authDomain: "prachuu-water-tracker.firebaseapp.com",
  projectId: "prachuu-water-tracker",
  storageBucket: "prachuu-water-tracker.firebasestorage.app",
  messagingSenderId: "14042922344",
  appId: "1:14042922344:web:190cc14f99c06999f3eadd",
  measurementId: "G-LS7D01MRE8"
};

// ---------- INIT FIREBASE ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

signInAnonymously(auth);

// ---------- STATE ----------
const maxCups = 14;  // your daily goal
let cups1 = 0, cups2 = 0;

const todayStr = () => new Date().toISOString().split("T")[0];

// ---------- UI UPDATE ----------
function updateUI() {
  document.getElementById("progress1").textContent = `${cups1} / ${maxCups} glasses`;
  document.getElementById("progress2").textContent = `${cups2} / ${maxCups} glasses`;

  document.getElementById("plant1").textContent =
    cups1 <= 1 ? "🌱" : cups1 <= 4 ? "🌿" : cups1 <= 10 ? "🌳" : "🌸";

  document.getElementById("plant2").textContent =
    cups2 <= 1 ? "🌱" : cups2 <= 4 ? "🌿" : cups2 <= 10 ? "🌳" : "🌸";
}

// ---------- FIRESTORE HELPERS ----------
async function loadCounts() {
  const pSnap = await getDoc(doc(db, "users", "prachuu", "water", todayStr()));
  const aSnap = await getDoc(doc(db, "users", "aaryann", "water", todayStr()));

  cups1 = pSnap.exists() ? pSnap.data().count : 0;
  cups2 = aSnap.exists() ? aSnap.data().count : 0;

  updateUI();
}

async function saveCount(user, count) {
  await setDoc(doc(db, "users", user, "water", todayStr()), { count, date: todayStr() });
}

async function saveHistory() {
  await setDoc(doc(db, "history", todayStr()), {
    date: todayStr(),
    prachuu: cups1,
    aaryann: cups2,
    completedP: Math.round((cups1 / maxCups) * 100),
    completedA: Math.round((cups2 / maxCups) * 100),
    savedAt: new Date().toISOString()
  });
}

async function loadHistory() {
  const snap = await getDocs(query(collection(db, "history"), orderBy("date", "desc")));
  let html = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Prachuu</th>
        <th>Aaryann</th>
        <th>% P</th>
        <th>% A</th>
      </tr>
    </thead>
    <tbody>
  `;
  snap.forEach(docSnap => {
    const d = docSnap.data();
    html += `
      <tr>
        <td>${d.date}</td>
        <td>${d.prachuu}</td>
        <td>${d.aaryann}</td>
        <td>${d.completedP}%</td>
        <td>${d.completedA}%</td>
      </tr>
    `;
  });
  html += "</tbody>";
  document.getElementById("historyTable").innerHTML = html;
}

// ---------- MIDNIGHT RESET ----------
function scheduleMidnightReset() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  const ms = nextMidnight - now;

  setTimeout(async () => {
    await saveHistory();
    cups1 = cups2 = 0;
    await saveCount("prachuu", 0);
    await saveCount("aaryann", 0);
    updateUI();
    await loadHistory();
    scheduleMidnightReset();
  }, ms);
}

// ---------- BUTTON HANDLERS ----------
document.getElementById("plus1").addEventListener("click", async () => {
  if (cups1 < maxCups) cups1++;
  updateUI();
  saveCount("prachuu", cups1);
});
document.getElementById("minus1").addEventListener("click", async () => {
  if (cups1 > 0) cups1--;
  updateUI();
  saveCount("prachuu", cups1);
});
document.getElementById("plus2").addEventListener("click", async () => {
  if (cups2 < maxCups) cups2++;
  updateUI();
  saveCount("aaryann", cups2);
});
document.getElementById("minus2").addEventListener("click", async () => {
  if (cups2 > 0) cups2--;
  updateUI();
  saveCount("aaryann", cups2);
});

// helper buttons
document.getElementById("saveBtn").addEventListener("click", async () => {
  await saveHistory();
  await loadHistory();
});
document.getElementById("saveResetBtn").addEventListener("click", async () => {
  await saveHistory();
  cups1 = cups2 = 0;
  await saveCount("prachuu", 0);
  await saveCount("aaryann", 0);
  updateUI();
  await loadHistory();
});
document.getElementById("historyBtn").addEventListener("click", loadHistory);

// ---------- INIT AFTER AUTH ----------
onAuthStateChanged(auth, async () => {
  await loadCounts();
  await loadHistory();
  scheduleMidnightReset();
});

import { useState, useEffect } from 'react';
import './App.css';
import { onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, lagerCollection, mealsCollection, expensesCollection } from './firebase';

function App() {
  // Navigation State: 'inventory', 'meals', oder 'expenses'
  const [activeTab, setActiveTab] = useState('inventory'); 

  // --- LAGER LOGIK ---
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState("Rewe");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  // --- REZEPTE LOGIK ---
  const [meals, setMeals] = useState([]);
  const [newMealName, setNewMealName] = useState("");
  const [ingName, setIngName] = useState("");
  const [ingAmount, setIngAmount] = useState("");
  const [ingStore, setIngStore] = useState("Rewe");
  const [activeMealIdForInput, setActiveMealIdForInput] = useState(null);

  // --- RECHNUNG / FINANZEN LOGIK (NEU) ---
  const [expenses, setExpenses] = useState([]);
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  // Datum standardmäßig auf "Heute" setzen
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);

  const stores = ["Rewe", "Rossmann", "Dm", "Aldi", "Edeka", "Lidl"];

  // 1. DATEN LADEN (Alle 3 Collections)
  useEffect(() => {
    const unsubLager = onSnapshot(lagerCollection, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubMeals = onSnapshot(mealsCollection, (snapshot) => {
      setMeals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    // NEU: Ausgaben laden
    const unsubExpenses = onSnapshot(expensesCollection, (snapshot) => {
      const loadedExpenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Sortieren nach Datum (neueste oben)
      loadedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(loadedExpenses);
    });

    return () => {
      unsubLager();
      unsubMeals();
      unsubExpenses();
    };
  }, []);

  // --- LAGER FUNKTIONEN ---
  const addItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    await addDoc(lagerCollection, {
      name: newItemName, store: newItemStore, quantity: parseInt(newItemQuantity)
    });
    setNewItemName("");
  };

  const updateQuantity = async (id, currentQuantity, change) => {
    const itemDoc = doc(db, "lagerbestand", id);
    await updateDoc(itemDoc, { quantity: Math.max(0, currentQuantity + change) });
  };

  // --- REZEPTE FUNKTIONEN ---
  const addMeal = async (e) => {
    e.preventDefault();
    if (!newMealName) return;
    await addDoc(mealsCollection, { name: newMealName, ingredients: [] });
    setNewMealName("");
  };

  const deleteMeal = async (id) => {
    await deleteDoc(doc(db, "essensplan", id));
  };

  const addIngredientToMeal = async (meal) => {
    if (!ingName) return;
    const newIngredient = { name: ingName, amount: ingAmount, store: ingStore };
    const updatedIngredients = [...(meal.ingredients || []), newIngredient];
    const mealDoc = doc(db, "essensplan", meal.id);
    await updateDoc(mealDoc, { ingredients: updatedIngredients });
    setIngName(""); setIngAmount(""); setActiveMealIdForInput(null);
  };

  // --- FINANZEN FUNKTIONEN (NEU) ---
  const addExpense = async (e) => {
    e.preventDefault();
    if (!newExpDesc || !newExpAmount) return;

    await addDoc(expensesCollection, {
      desc: newExpDesc,
      amount: parseFloat(newExpAmount), // Als Zahl speichern für Mathe
      date: newExpDate
    });

    setNewExpDesc("");
    setNewExpAmount("");
    // Datum lassen wir auf dem zuletzt gewählten stehen, falls man mehrere Sachen vom gleichen Tag einträgt
  };

  const deleteExpense = async (id) => {
    if(window.confirm("Eintrag wirklich löschen?")) {
      await deleteDoc(doc(db, "ausgaben", id));
    }
  };

  // Berechnung der Gesamtsumme
  const totalAmount = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Helper: Formatierung als Währung (z.B. 12,50 €)
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  };

  // Helper: Datum schön formatieren (z.B. 24.12.2023)
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('de-DE', options);
  };

  // Helper: Gruppierung nach Monat für die Anzeige
  // Wir erstellen ein Objekt: { "Dezember 2023": [Items...], "November 2023": [Items...] }
  const expensesByMonth = expenses.reduce((groups, expense) => {
    const date = new Date(expense.date);
    const monthYear = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(expense);
    return groups;
  }, {});


  // --- EINKAUFSLISTE GENERIEREN ---
  const shoppingListItems = items.filter(item => item.quantity === 0);
  const shoppingListByStore = shoppingListItems.reduce((acc, item) => {
    const store = item.store || "Sonstiges";
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="container">
        
        {/* VIEW 1: LAGER */}
        {activeTab === 'inventory' && (
          <>
            <h1>Larissa's Lager</h1>
            <div className="card">
              <h3>Neues Produkt</h3>
              <form onSubmit={addItem} style={{marginTop: '10px'}}>
                <input 
                  type="text" placeholder="Produktname" 
                  value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                />
                <div style={{display:'flex', gap:'10px'}}>
                  <select value={newItemStore} onChange={(e) => setNewItemStore(e.target.value)}>
                    {stores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input 
                    type="number" style={{width:'80px'}} value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)} min="0"
                  />
                </div>
                <button type="submit" className="primary-btn">Hinzufügen</button>
              </form>
            </div>

            <h2>📦 Bestand</h2>
            <div className="inventory-list">
              {items.map(item => (
                <div key={item.id} className={`item-card ${item.quantity === 0 ? 'empty' : ''}`}>
                  <div>
                    <span className="store-tag">{item.store}</span>
                    <span style={{fontWeight: '600', fontSize:'17px'}}>{item.name}</span>
                  </div>
                  <div className="controls">
                    <button onClick={() => updateQuantity(item.id, item.quantity, -1)}>-</button>
                    <span className="quantity">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <h2>🛒 Einkaufsliste</h2>
            {shoppingListItems.length === 0 ? <p style={{color:'#8E8E93'}}>Alles da!</p> : (
              <div>
                {Object.keys(shoppingListByStore).map(storeName => (
                  <div key={storeName} className="store-group">
                    <div className="store-header">{storeName}</div>
                    <div className="shopping-list-card">
                      {shoppingListByStore[storeName].map(item => (
                        <div key={item.id} className="shopping-item">
                          <span>{item.name}</span>
                          <span style={{color:'#8E8E93'}}>Nachkaufen</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: KOCHEN */}
        {activeTab === 'meals' && (
          <>
            <h1>Essen heute</h1>
            <div className="card">
              <h3>Was essen wir?</h3>
              <form onSubmit={addMeal} style={{marginTop: '10px', display:'flex', gap:'10px'}}>
                <input 
                  type="text" placeholder="z.B. Nudelauflauf" 
                  value={newMealName} onChange={(e) => setNewMealName(e.target.value)}
                  style={{marginBottom:0}}
                />
                <button type="submit" className="primary-btn" style={{width:'auto'}}>Go</button>
              </form>
            </div>
            <div className="meal-list">
              {meals.map(meal => (
                <div key={meal.id} className="meal-card">
                  <div className="meal-header">
                    <span style={{fontSize:'20px', fontWeight:'700'}}>{meal.name}</span>
                    <button className="delete-meal" onClick={() => deleteMeal(meal.id)}>Löschen</button>
                  </div>
                  <div className="ingredient-list">
                    {meal.ingredients && meal.ingredients.length > 0 ? (
                      meal.ingredients.map((ing, index) => (
                        <div key={index} className="ingredient-row">
                          <span>{ing.amount} {ing.name}</span>
                          <span style={{color:'#8E8E93', fontSize:'13px'}}>{ing.store}</span>
                        </div>
                      ))
                    ) : <p style={{fontSize:'14px', color:'#aaa'}}>Keine Zutaten</p>}
                  </div>
                  {activeMealIdForInput === meal.id ? (
                    <div className="add-ingredient-box">
                      <input 
                        type="text" placeholder="Zutat" value={ingName} onChange={e => setIngName(e.target.value)} autoFocus
                      />
                      <div style={{display:'flex', gap:'5px'}}>
                        <input type="text" placeholder="Menge" style={{width:'80px'}} value={ingAmount} onChange={e => setIngAmount(e.target.value)} />
                        <select value={ingStore} onChange={e => setIngStore(e.target.value)}>
                          {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                        <button className="primary-btn" onClick={() => addIngredientToMeal(meal)} style={{padding:'8px'}}>Save</button>
                        <button className="delete-btn" onClick={() => setActiveMealIdForInput(null)}>X</button>
                      </div>
                    </div>
                  ) : (
                    <button style={{background:'none', border:'none', color:'#007AFF', marginTop:'10px', fontWeight:'600'}} onClick={() => setActiveMealIdForInput(meal.id)}>+ Zutaten</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 3: RECHNUNG (NEU) */}
        {activeTab === 'expenses' && (
          <>
            <h1>Abrechnung</h1>
            
            <div className="card">
              <h3>Neuer Eintrag</h3>
              <form onSubmit={addExpense} style={{marginTop: '10px'}}>
                <input 
                  type="text" placeholder="Beschreibung (z.B. McDonald's)" 
                  value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)}
                />
                <div style={{display:'flex', gap:'10px'}}>
                  <input 
                    type="number" step="0.01" placeholder="Betrag (€)" 
                    value={newExpAmount} onChange={(e) => setNewExpAmount(e.target.value)}
                  />
                  <input 
                    type="date" 
                    value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)}
                  />
                </div>
                <button type="submit" className="primary-btn">Hinzufügen</button>
              </form>
            </div>

            <div style={{marginBottom: '100px'}}> {/* Platz für Sticky Footer */}
              {Object.keys(expensesByMonth).map(month => (
                <div key={month}>
                  <div className="month-divider">{month}</div>
                  <div className="card" style={{padding: '0 16px'}}> {/* Liste in einer Karte */}
                    {expensesByMonth[month].map(exp => (
                      <div key={exp.id} className="expense-item">
                        <div className="expense-info">
                          <span style={{fontWeight:'600'}}>{exp.desc}</span>
                          <span className="expense-date">{formatDate(exp.date)}</span>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                          <span className="expense-amount">{formatCurrency(exp.amount)}</span>
                          <button className="delete-btn" onClick={() => deleteExpense(exp.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {expenses.length === 0 && <p style={{textAlign:'center', color:'#888', marginTop:'30px'}}>Noch keine Ausgaben eingetragen.</p>}
            </div>

            {/* STICKY TOTAL FOOTER */}
            <div className="total-sticky-bar">
              <span className="total-label">Gesamtsumme</span>
              <span className="total-value">{formatCurrency(totalAmount)}</span>
            </div>
          </>
        )}

      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="nav-icon">🏠</span>
          Lager
        </button>
        <button 
          className={`nav-item ${activeTab === 'meals' ? 'active' : ''}`}
          onClick={() => setActiveTab('meals')}
        >
          <span className="nav-icon">🍝</span>
          Kochen
        </button>
        <button 
          className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <span className="nav-icon">💸</span>
          Rechnung
        </button>
      </div>
    </div>
  );
}

export default App;
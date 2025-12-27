import { useState, useEffect } from 'react';
import './App.css';
import { onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, lagerCollection, mealsCollection } from './firebase';

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' oder 'meals'

  // --- LAGER LOGIK ---
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState("Rewe");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  // --- REZEPTE LOGIK ---
  const [meals, setMeals] = useState([]);
  const [newMealName, setNewMealName] = useState("");
  // State für Zutaten-Hinzufügen innerhalb eines Rezepts
  const [ingName, setIngName] = useState("");
  const [ingAmount, setIngAmount] = useState("");
  const [ingStore, setIngStore] = useState("Rewe");
  const [activeMealIdForInput, setActiveMealIdForInput] = useState(null); // Welches Rezept bearbeiten wir gerade?

  // LÄDEN LISTE (Jetzt mit Lidl)
  const stores = ["Rewe", "Rossmann", "Dm", "Aldi", "Edeka", "Lidl"];

  // 1. DATEN LADEN (Beide Collections)
  useEffect(() => {
    // Lager laden
    const unsubLager = onSnapshot(lagerCollection, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    // Mahlzeiten laden
    const unsubMeals = onSnapshot(mealsCollection, (snapshot) => {
      setMeals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => {
      unsubLager();
      unsubMeals();
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

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, "lagerbestand", id));
  };

  // --- REZEPTE FUNKTIONEN ---
  const addMeal = async (e) => {
    e.preventDefault();
    if (!newMealName) return;
    // Ein neues Rezept ist ein Dokument mit Namen und einer leeren Zutatenliste
    await addDoc(mealsCollection, {
      name: newMealName,
      ingredients: [] 
    });
    setNewMealName("");
  };

  const deleteMeal = async (id) => {
    await deleteDoc(doc(db, "essensplan", id));
  };

  // Zutat zu einem Rezept hinzufügen
  const addIngredientToMeal = async (meal) => {
    if (!ingName) return;
    
    const newIngredient = {
      name: ingName,
      amount: ingAmount,
      store: ingStore
    };

    const updatedIngredients = [...(meal.ingredients || []), newIngredient];
    
    const mealDoc = doc(db, "essensplan", meal.id);
    await updateDoc(mealDoc, { ingredients: updatedIngredients });
    
    // Reset inputs
    setIngName(""); setIngAmount(""); setActiveMealIdForInput(null);
  };

  // --- EINKAUFSLISTE GENERIEREN ---
  // Kombiniert leere Lagerbestände UND Zutaten aus den Rezepten?
  // Für dieses Beispiel trennen wir es visuell, damit es übersichtlich bleibt.
  
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
        
        {/* VIEW 1: LAGER & EINKAUFSLISTE */}
        {activeTab === 'inventory' && (
          <>
            <h1>Larissa's Lager</h1>
            
            {/* Input Card */}
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

            {/* Inventory List */}
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

            {/* Shopping List */}
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

        {/* VIEW 2: ESSEN HEUTE (REZEPTE) */}
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
                    <button className="delete-meal" onClick={() => deleteMeal(meal.id)}>Fertig / Löschen</button>
                  </div>

                  {/* Zutaten Liste für dieses Gericht */}
                  <div className="ingredient-list">
                    {meal.ingredients && meal.ingredients.length > 0 ? (
                      meal.ingredients.map((ing, index) => (
                        <div key={index} className="ingredient-row">
                          <span>{ing.amount} {ing.name}</span>
                          <span style={{color:'#8E8E93', fontSize:'13px'}}>{ing.store}</span>
                        </div>
                      ))
                    ) : <p style={{fontSize:'14px', color:'#aaa'}}>Noch keine Zutaten</p>}
                  </div>

                  {/* Zutaten hinzufügen Feld */}
                  {activeMealIdForInput === meal.id ? (
                    <div className="add-ingredient-box">
                      <input 
                        type="text" placeholder="Zutat (z.B. Nudeln)" 
                        value={ingName} onChange={e => setIngName(e.target.value)} autoFocus
                      />
                      <div style={{display:'flex', gap:'5px'}}>
                        <input 
                          type="text" placeholder="Menge" style={{width:'80px'}}
                          value={ingAmount} onChange={e => setIngAmount(e.target.value)}
                        />
                        <select value={ingStore} onChange={e => setIngStore(e.target.value)}>
                          {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                        <button className="primary-btn" onClick={() => addIngredientToMeal(meal)} style={{fontSize:'14px', padding:'8px'}}>Speichern</button>
                        <button className="delete-btn" onClick={() => setActiveMealIdForInput(null)}>Abbruch</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      style={{background:'none', border:'none', color:'#007AFF', marginTop:'10px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}
                      onClick={() => setActiveMealIdForInput(meal.id)}
                    >
                      + Zutaten hinzufügen
                    </button>
                  )}
                </div>
              ))}
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
      </div>
    </div>
  );
}

export default App;
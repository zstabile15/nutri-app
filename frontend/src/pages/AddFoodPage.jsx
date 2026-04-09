import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ScanLine, Plus, ChevronRight, X, Star } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// Conversion factors to base units (grams / milliliters)
const WEIGHT_TO_G = { g: 1, oz: 28.3495 };
const VOL_TO_ML = { ml: 1, cup: 236.588, tbsp: 14.787, tsp: 4.929 };

function getAvailableUnits(food) {
  if (!food) return ['serving'];
  const units = ['serving'];
  if (food.serving_unit in WEIGHT_TO_G) {
    units.push('g', 'oz');
  } else if (food.serving_unit in VOL_TO_ML) {
    units.push('ml', 'cup', 'tbsp', 'tsp');
  }
  return units;
}

// Returns a multiplier relative to 1 serving of the food
function getServingsMultiplier(amount, unit, food) {
  if (unit === 'serving') return amount;
  if (unit in WEIGHT_TO_G && food.serving_unit in WEIGHT_TO_G) {
    const amountInG = amount * WEIGHT_TO_G[unit];
    const servingInG = food.serving_size * WEIGHT_TO_G[food.serving_unit];
    return amountInG / servingInG;
  }
  if (unit in VOL_TO_ML && food.serving_unit in VOL_TO_ML) {
    const amountInMl = amount * VOL_TO_ML[unit];
    const servingInMl = food.serving_size * VOL_TO_ML[food.serving_unit];
    return amountInMl / servingInMl;
  }
  return amount / food.serving_size;
}

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}

export default function AddFoodPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState(1);
  const [amountUnit, setAmountUnit] = useState('serving');
  const [mealType, setMealType] = useState(guessMealType);
  const [logging, setLogging] = useState(false);
  const [recentFoods, setRecentFoods] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const debounceRef = useRef(null);

  const selectFood = (food) => {
    setSelectedFood(food);
    setAmount(1);
    setAmountUnit('serving');
  };

  const handleUnitChange = (newUnit) => {
    if (!selectedFood) return;
    const currentMultiplier = getServingsMultiplier(amount, amountUnit, selectedFood);
    let newAmount;
    if (newUnit === 'serving') {
      newAmount = currentMultiplier;
    } else if (newUnit in WEIGHT_TO_G) {
      const baseInG = selectedFood.serving_unit in WEIGHT_TO_G
        ? currentMultiplier * selectedFood.serving_size * WEIGHT_TO_G[selectedFood.serving_unit]
        : currentMultiplier * selectedFood.serving_size;
      newAmount = baseInG / WEIGHT_TO_G[newUnit];
    } else if (newUnit in VOL_TO_ML) {
      const baseInMl = selectedFood.serving_unit in VOL_TO_ML
        ? currentMultiplier * selectedFood.serving_size * VOL_TO_ML[selectedFood.serving_unit]
        : currentMultiplier * selectedFood.serving_size;
      newAmount = baseInMl / VOL_TO_ML[newUnit];
    } else {
      newAmount = currentMultiplier;
    }
    setAmount(Math.round(newAmount * 100) / 100);
    setAmountUnit(newUnit);
  };

  // Custom food fields
  const [custom, setCustom] = useState({
    name: '', brand: '', calories: '', protein: '', carbs: '', fat: '',
    fiber: '', serving_size: '100', serving_unit: 'g',
  });

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api.searchFoods(q);
      setResults(r);
    } catch (err) {
      console.error(err);
    }
    setSearching(false);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleBarcodeScan = useCallback(async (code) => {
    setShowScanner(false);
    setSearching(true);
    try {
      const food = await api.lookupBarcode(code);
      selectFood(food);
    } catch {
      setQuery(code);
      doSearch(code);
    }
    setSearching(false);
  }, [doSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const logFood = async (food) => {
    const multiplier = getServingsMultiplier(amount, amountUnit, food);
    setLogging(true);
    try {
      await api.logMeal({
        food_item_id: food.id,
        food_name: food.name,
        meal_type: mealType,
        servings: multiplier,
        calories: food.calories * multiplier,
        protein: food.protein * multiplier,
        carbs: food.carbs * multiplier,
        fat: food.fat * multiplier,
        fiber: (food.fiber || 0) * multiplier,
        sugar: (food.sugar || 0) * multiplier,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
    setLogging(false);
  };

  const handleCustomSubmit = async () => {
    setLogging(true);
    try {
      const food = await api.createCustomFood({
        name: custom.name,
        brand: custom.brand || undefined,
        calories: parseFloat(custom.calories) || 0,
        protein: parseFloat(custom.protein) || 0,
        carbs: parseFloat(custom.carbs) || 0,
        fat: parseFloat(custom.fat) || 0,
        fiber: parseFloat(custom.fiber) || 0,
        serving_size: parseFloat(custom.serving_size) || 100,
        serving_unit: custom.serving_unit,
      });
      selectFood(food);
      setShowCustom(false);
    } catch (err) {
      console.error(err);
    }
    setLogging(false);
  };

  const loadRecent = async () => {
    try {
      const r = await api.recentFoods();
      setRecentFoods(r);
      setShowRecent(true);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <h1 className="page-title">Add Food</h1>

      {/* Meal type selector */}
      <div className="tabs">
        {MEAL_TYPES.map(t => (
          <button
            key={t}
            className={`tab ${mealType === t ? 'active' : ''}`}
            onClick={() => setMealType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {!showScanner && !selectedFood && (
        <>
          <div className="search-container">
            <div className="search-input-wrap">
              <Search size={18} color="var(--text-tertiary)" />
              <input
                placeholder="Search foods..."
                value={query}
                onChange={handleQueryChange}
                autoFocus
              />
              {query && (
                <button className="btn btn-icon btn-ghost" onClick={() => { setQuery(''); setResults([]); }}>
                  <X size={16} />
                </button>
              )}
              <button className="btn btn-icon btn-ghost" onClick={() => setShowScanner(true)}>
                <ScanLine size={20} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCustom(true)}>
              <Plus size={16} /> Custom Food
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadRecent}>
              <Star size={16} /> Recent
            </button>
          </div>

          {searching && (
            <div className="flex-center" style={{ padding: '24px 0' }}>
              <span className="spinner" />
            </div>
          )}

          {showRecent && recentFoods.length > 0 && !query && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <p className="section-title">Recent Foods</p>
              <div className="search-results">
                {recentFoods.map(food => (
                  <div key={food.id} className="food-result" onClick={() => selectFood(food)}>
                    <div className="food-result-info">
                      <div className="food-result-name">{food.name}</div>
                      {food.brand && <div className="food-result-brand">{food.brand}</div>}
                    </div>
                    <span className="food-result-cals">{Math.round(food.calories)} kcal</span>
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-results" style={{ marginTop: 'var(--space-md)' }}>
              {results.map((food, i) => (
                <div key={`${food.source}-${food.source_id || food.id}-${i}`} className="food-result" onClick={() => selectFood(food)}>
                  <div className="food-result-info">
                    <div className="food-result-name">{food.name}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {food.brand && <span className="food-result-brand">{food.brand}</span>}
                      <span className="food-source-badge">{food.source || 'local'}</span>
                    </div>
                  </div>
                  <span className="food-result-cals">{Math.round(food.calories)} kcal</span>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Barcode scanner */}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Food detail / log confirmation */}
      {selectedFood && (
        <Modal title="Log Food" onClose={() => { setSelectedFood(null); setAmount(1); setAmountUnit('serving'); }}>
          <div className="flex-col gap-md">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedFood.name}</h3>
              {selectedFood.brand && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedFood.brand}</p>
              )}
            </div>

            <div className="card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <div className="grid-4" style={{ textAlign: 'center' }}>
                {(() => {
                  const m = getServingsMultiplier(amount, amountUnit, selectedFood);
                  return (
                    <>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-text)' }}>{Math.round(selectedFood.calories * m)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>kcal</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--protein-color)' }}>{Math.round(selectedFood.protein * m)}g</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Protein</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--carbs-color)' }}>{Math.round(selectedFood.carbs * m)}g</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Carbs</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--fat-color)' }}>{Math.round(selectedFood.fat * m)}g</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Fat</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Amount</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="select" value={amountUnit} onChange={e => handleUnitChange(e.target.value)}>
                  {getAvailableUnits(selectedFood).map(u => (
                    <option key={u} value={u}>
                      {u === 'serving' ? `serving (${selectedFood.serving_size}${selectedFood.serving_unit})` : u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Meal</label>
              <select className="select" value={mealType} onChange={e => setMealType(e.target.value)}>
                {MEAL_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => logFood(selectedFood)}
              disabled={logging}
            >
              {logging ? <span className="spinner" /> : <><Plus size={18} /> Log Food</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Custom food modal */}
      {showCustom && (
        <Modal title="Create Custom Food" onClose={() => setShowCustom(false)}>
          <div className="flex-col gap-md">
            <div className="input-group">
              <label>Name *</label>
              <input className="input" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Homemade Granola" />
            </div>
            <div className="input-group">
              <label>Brand</label>
              <input className="input" value={custom.brand} onChange={e => setCustom(c => ({ ...c, brand: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Calories</label>
                <input className="input" type="number" value={custom.calories} onChange={e => setCustom(c => ({ ...c, calories: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Protein (g)</label>
                <input className="input" type="number" value={custom.protein} onChange={e => setCustom(c => ({ ...c, protein: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Carbs (g)</label>
                <input className="input" type="number" value={custom.carbs} onChange={e => setCustom(c => ({ ...c, carbs: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Fat (g)</label>
                <input className="input" type="number" value={custom.fat} onChange={e => setCustom(c => ({ ...c, fat: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Serving size</label>
                <input className="input" type="number" value={custom.serving_size} onChange={e => setCustom(c => ({ ...c, serving_size: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="select" value={custom.serving_unit} onChange={e => setCustom(c => ({ ...c, serving_unit: e.target.value }))}>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="cup">cup</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleCustomSubmit} disabled={!custom.name || logging}>
              {logging ? <span className="spinner" /> : 'Create & Select'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useSearchParams, Navigate } from 'react-router-dom';
import DiveRunner from '../dive/DiveRunner.jsx';
import { todayKey, isValidDay } from '../game/daily.js';
import { hasDailyPlan } from '../game/plan.js';
import { CATEGORY_BY_ID } from '../game/content/index.js';
import { useProgress } from '../data/progress.js';

export default function Dive() {
  const [params] = useSearchParams();
  const savedCat = useProgress((s) => s.category);
  const cat = CATEGORY_BY_ID[params.get('cat')] ? params.get('cat') : savedCat;
  const runs = useProgress((s) => s.runs);
  const history = useProgress((s) => s.history);
  const date = params.get('date') || todayKey();
  const id = `daily:${date}:${cat}`;
  if (!isValidDay(date) || (!hasDailyPlan(date) && !runs[id] && !history[id])) {
    return <Navigate to="/archive" replace />;
  }
  return <DiveRunner key={id} mode="daily" date={date} cat={cat} />;
}

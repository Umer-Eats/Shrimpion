import { useSearchParams, Navigate } from 'react-router-dom';
import DiveRunner from '../dive/DiveRunner.jsx';
import { todayKey, isValidDay } from '../game/daily.js';
import { CATEGORY_BY_ID } from '../game/content/index.js';
import { useProgress } from '../data/progress.js';

export default function Dive() {
  const [params] = useSearchParams();
  const savedCat = useProgress((s) => s.category);
  const cat = CATEGORY_BY_ID[params.get('cat')] ? params.get('cat') : savedCat;
  const date = params.get('date') || todayKey();
  if (!isValidDay(date)) return <Navigate to="/archive" replace />;
  return <DiveRunner mode="daily" date={date} cat={cat} />;
}

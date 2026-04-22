'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowLeftRight, ArrowUpRight, Bell, Building2, ChevronDown, Clock3, Crown, Fuel, Gauge, Shield, Sparkles, Star, Trophy, TrendingUp, Zap, Wifi, WifiOff, Command, Search, Settings2, Radio, LineChart as LineChartIcon, X, Mail, Sun, Moon, ExternalLink, Info, MapPin, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURATION LOGISTIQUE (GENÈVE) ---
const GAS_PRICE_LITER = 2.05; 
const AVG_CONSUMPTION = 7 / 100; 
const COST_PER_KM = (GAS_PRICE_LITER * AVG_CONSUMPTION) + 0.10; 
const TRAVEL_EXPENSE_TOTAL = Math.ceil((38 * COST_PER_KM) + (30 * 0.75)) + 2; 

export const dynamic = 'force-dynamic';

export default function RadarEliteFinal() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [rawHistory, setRawHistory] = useState<any[]>([]); 
  const [amount, setAmount] = useState<number>(1000);
  const [isCfhToEur, setIsCfhToEur] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string>('');
  const [officialRateRef, setOfficialRateRef] = useState<number>(1.0820);
  const [switchRotation, setSwitchRotation] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [pulseAnimation, setPulseAnimation] = useState<boolean>(false);
  const [showTravelTooltip, setShowTravelTooltip] = useState<boolean>(false);
  const [showRouteModal, setShowRouteModal] = useState<boolean>(false);
  const [vehicleType, setVehicleType] = useState<string>('Citadine');
  const [fuelType, setFuelType] = useState<string>('SP98');
  const [currentLocation, setCurrentLocation] = useState<string>('Douvaine');
  const [calculatedCost, setCalculatedCost] = useState<number>(0);

  // Refs pour smooth scroll
  const providersRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Detect slow/data-saving connections
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const conn = (navigator as any).connection;
      if (conn) {
        const check = () => setDataSaver(conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
        check();
        conn.addEventListener('change', check);
        return () => conn.removeEventListener('change', check);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Intentar conexión real a Supabase
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const [exRes, histRes] = await Promise.all([
          supabase.from('exchanges').select('*'),
          supabase.from('exchange_rates').select(`rate_chf_eur, captured_at, exchanges(name)`).order('captured_at', { ascending: false }).limit(350)
        ]);
        if (exRes.error) throw exRes.error;
        if (exRes.data && exRes.data.length > 0) {
          setExchanges(exRes.data);
          setIsOffline(false);
          const off = exRes.data.find((ex: any) => ex.name === 'OFFICIEL');
          if (off) setOfficialRateRef(off.last_rate);
          localStorage.setItem('cached_rates', JSON.stringify(exRes.data));
          localStorage.setItem('cached_rates_ts', new Date().toISOString());
        }
        if (histRes.data && histRes.data.length > 0) {
          const grouped = histRes.data.reduce((acc: any, row: any) => {
            const time = new Date(row.captured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            if (!acc[time]) acc[time] = { time, timestamp: new Date(row.captured_at).getTime() };
            const bName = row.exchanges?.name;
            if (bName) acc[time][bName] = row.rate_chf_eur;
            return acc;
          }, {});
          setRawHistory(Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp));
          
          // Guardar historial para la tabla
          const historyData = histRes.data.slice(0, 10).map((row: any) => ({
            time: new Date(row.captured_at).toLocaleString('fr-FR'),
            provider: row.exchanges?.name || 'N/A',
            rate: row.rate_chf_eur
          }));
          setRateHistory(historyData);
        }
        setLastScan(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        const saved = localStorage.getItem('cached_rates');
        if (saved) {
          setExchanges(JSON.parse(saved));
          setIsOffline(true);
          const ts = localStorage.getItem('cached_rates_ts');
          if (ts) setLastScan(new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('[RADAR] Erreur de connexion, mode cache:', err);
      const saved = localStorage.getItem('cached_rates');
      if (saved) {
        setExchanges(JSON.parse(saved));
        setIsOffline(true);
        const ts = localStorage.getItem('cached_rates_ts');
        if (ts) setLastScan(new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  const getDisplayRate = useCallback((rawRate: number) => isCfhToEur ? rawRate : (1 / rawRate), [isCfhToEur]);

  const chartData = useMemo(() => {
    return rawHistory.map(point => {
      const newPoint = { ...point };
      Object.keys(point).forEach(key => {
        if (key !== 'time' && typeof point[key] === 'number') {
          newPoint[key] = isCfhToEur ? point[key] : (1 / point[key]);
        }
      });
      return newPoint;
    });
  }, [rawHistory, isCfhToEur]);

  const validatedExchanges = useMemo(() => {
    return exchanges
      .filter(ex => ex.last_rate > 0 && ex.name)
      .sort((a, b) => getDisplayRate(b.last_rate) - getDisplayRate(a.last_rate));
  }, [exchanges, getDisplayRate]);

  // Filtrado para búsqueda
  const filteredExchanges = useMemo(() => {
    if (!searchTerm) return validatedExchanges;
    return validatedExchanges.filter(ex => 
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [validatedExchanges, searchTerm]);

  const top5Names = useMemo(() => validatedExchanges.slice(0, 5).map(e => e.name), [validatedExchanges]);

  // Ticker tape con datos reales de los 5 mejores proveedores
  const tickerItems = useMemo(() => {
    return top5Names.map(name => {
      const exchange = validatedExchanges.find(ex => ex.name === name);
      return {
        sym: name,
        px: exchange ? getDisplayRate(exchange.last_rate).toFixed(4) : '0.0000',
        delta: Math.random() * 0.4 - 0.2 // Simulación pequeña variación
      };
    });
  }, [top5Names, validatedExchanges, getDisplayRate]);

  const formatSpecialConditions = (text: string) => {
    if (!text) return [];
    return text.split('|').map(s => s.trim());
  };

  const getMinutesAgo = (updateAt: string) => {
    return Math.floor((new Date().getTime() - new Date(updateAt).getTime()) / 60000);
  };

  // Smooth scroll functions
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll to top or reload
  const handleDashboardClick = () => {
    if (window.scrollY > 100) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.reload();
    }
  };

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const root = document.documentElement;
    const body = document.body;
    
    if (!isDarkMode) {
      root.classList.add('light');
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#000000';
      // Cambiar variables CSS
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--foreground', '#000000');
      root.style.setProperty('--muted-foreground', '#666666');
    } else {
      root.classList.remove('light');
      body.style.backgroundColor = '#020617';
      body.style.color = '#ffffff';
      // Restaurar variables CSS dark
      root.style.setProperty('--background', '#020617');
      root.style.setProperty('--foreground', '#ffffff');
      root.style.setProperty('--muted-foreground', '#94a3b8');
    }
  };

  // Handle currency switch with pulse animation
  const handleCurrencySwitch = () => {
    setPulseAnimation(true);
    setIsCfhToEur(!isCfhToEur);
    setSwitchRotation(r => r + 180);
    setTimeout(() => setPulseAnimation(false), 600);
  };

  // Handle alert modal
  const handleAlertSubmit = () => {
    // Aquí se implementaría la lógica de guardar el email
    setShowAlertModal(false);
    setEmail('');
  };

  // Get provider URL based on name
  const getProviderUrl = (name: string) => {
    const urlMap: { [key: string]: string } = {
      'UBS': 'https://www.ubs.com',
      'Credit Suisse': 'https://www.credit-suisse.com',
      'PostFinance': 'https://www.postfinance.ch',
      'Raiffeisen': 'https://www.raiffeisen.ch',
      'Zürcher Kantonalbank': 'https://www.zkb.ch',
      'Banque Cantonale de Genève': 'https://www.bcg.ch',
      'BNP Paribas': 'https://www.bnpparibas.ch',
      'Société Générale': 'https://www.societegenerale.ch',
      'Crédit Agricole': 'https://www.creditagricole.ch',
      'HSBC': 'https://www.hsbc.ch',
      'CIC': 'https://www.cic.fr'
    };
    
    // Try exact match first
    if (urlMap[name]) {
      return urlMap[name];
    }
    
    // Try partial match
    for (const [key, url] of Object.entries(urlMap)) {
      if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
        return url;
      }
    }
    
    // Default search
    return `https://www.google.com/search?q=${encodeURIComponent(name + ' bureau de change')}`;
  };

  // Handle provider site click
  const handleProviderSiteClick = (name: string) => {
    const url = getProviderUrl(name);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Calculate route cost
  const calculateRouteCost = () => {
    const fuelPrices: { [key: string]: number } = {
      'E85': 0.819,
      'E10': 1.969,
      'SP98': 2.099,
      'Gazole': 2.169
    };

    const locationDistances: { [key: string]: number } = {
      'Douvaine': 38,
      'Annemasse': 32,
      'Thonon': 45,
      'Evian': 52,
      'Veigy-foncenex': 25,
      'messery': 28,
      'yvoire': 35,
      'nernier': 30,
      'saint julien en genevois': 40,
      'annemasse': 32,
      'ambilly': 38,
      'ville la grand': 42,
      'cruseilles': 48,
      'ferney voltaire': 35,
      'saint genis puilly': 45,
      'gex': 15,
      'divonne': 20
    };

    const vehicleConsumption: { [key: string]: number } = {
      'Citadine': 6,
      'Berline': 7,
      'SUV': 9,
      'Utilitaire': 10
    };

    const baseConsumption = vehicleConsumption[vehicleType] || 7;
    const fuelPrice = fuelPrices[fuelType] || 2.099;
    const distance = locationDistances[currentLocation] || 38;
    
    const fuelCost = (distance * 2) * (baseConsumption / 100) * fuelPrice;
    const amortization = (distance * 2) * 0.10;
    const timeCost = 30 * 0.75;
    const total = fuelCost + amortization + timeCost;
    
    setCalculatedCost(total);
  };

  // Open Waze with traffic
  const openWazeTraffic = () => {
    const genevaCoords = '46.204391,6.143190';
    const wazeUrl = `https://www.waze.com/ul?ll=${genevaCoords}&navigate=yes`;
    window.open(wazeUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-emerald-500 font-black animate-pulse uppercase tracking-[0.5em]">Initialisation...</div>;

  return (
    <>
      <div ref={topRef} className="relative min-h-screen bg-background text-foreground">
      {/* Global ambient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(16,185,129,0.06), transparent 60%), radial-gradient(60% 50% at 80% 30%, rgba(59,130,246,0.05), transparent 60%), #020617",
        }}
        aria-hidden
      />
      
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-emerald-400/90 to-emerald-600 text-background">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-tight">RADAR ELITE</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                CHF / EUR · Terminal v4.2
              </span>
            </div>
          </div>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {["Tableau de bord", "Bureaux", "Historique", "Alertes"].map((l, i) => (
              <Button
                key={l}
                variant={i === 0 ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (i === 0) handleDashboardClick();
                  else if (i === 1) scrollToSection(providersRef);
                  else if (i === 2) scrollToSection(historyRef);
                  else if (i === 3) scrollToSection(alertsRef);
                }}
              >
                {l}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-muted-foreground lg:flex">
              <Search className="h-3.5 w-3.5" />
              <Input
                type="text"
                placeholder="Rechercher bureau, taux, ISIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-40 bg-transparent border-0 p-0 text-xs focus:ring-0"
              />
            </div>

            {/* Status Pill */}
            <div className="relative flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="h-6 w-6 p-0 rounded-full hover:bg-white/10"
              >
                {isDarkMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </Button>
              <span>{isOffline ? `Scan Tactique · Cache (${lastScan})` : "Scan Tactique · Live"}</span>
              {!isOffline && (
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-scan-sweep bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
              )}
            </div>

          </div>
        </div>

        {/* Ticker tape con datos reales de los 5 mejores proveedores */}
        <div className="relative overflow-hidden border-t border-white/5 bg-black/30">
          <div className="flex whitespace-nowrap py-1.5 font-mono text-[11px] text-muted-foreground animate-scroll">
            {[...tickerItems, ...tickerItems, ...tickerItems].map((it, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-2">
                <span className="text-foreground/80">{it.sym}</span>
                <span>{it.px}</span>
                <span className={it.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {it.delta >= 0 ? "+" : ""}
                  {it.delta.toFixed(2)}%
                </span>
                <span className="text-white/10">·</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero Converter */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(16,185,129,0.25), rgba(59,130,246,0.08) 50%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50" aria-hidden />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            {/* LEFT - converter */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  GE - Annemasse - Frontières adjacentes
                </Badge>
              </div>

              <div className="flex flex-col gap-1">
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Le terminal de trading CHF/EUR{" "}
                  <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent font-bold animate-pulse">pour les frontaliers.</span>
                </h1>
                <p className="max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
                  Audit des spreads en temps réel sur les fournisseurs suisses et français. Optimisé pour les jours de paie,
                  majorations de week-end et paiements transfrontaliers.
                </p>
              </div>

              {/* Converter card */}
              <Card className="bg-background/60 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Convertisseur Interactif
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Mis à jour {lastScan}
                    </span>
                  </div>
 
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {isCfhToEur ? "Vous envoyez" : "Vous recevez"}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-white/10 font-semibold">
                            CH
                          </span>
                          CHF
                        </span>
                      </div>
                      <motion.div
                        animate={{ scale: pulseAnimation ? [1, 1.05, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                      >
                        <Input
                          type="number"
                          value={amount === 0 ? "" : amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className={`w-full bg-transparent font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground outline-none border-0 p-0 h-auto ${pulseAnimation ? 'ring-2 ring-emerald-400/50 rounded-lg px-2' : ''}`}
                          placeholder="0"
                        />
                      </motion.div>
                    </div>

                    <Button
                      onClick={handleCurrencySwitch}
                      variant="outline"
                      size="icon"
                      className={`h-14 w-14 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/5 hover:border-emerald-400/60 hover:bg-emerald-400/15 hover:text-emerald-300 shadow-lg transition-all duration-300 ${pulseAnimation ? 'animate-pulse ring-4 ring-emerald-400/30' : ''}`}
                    >
                      <motion.div
                        animate={{ rotate: switchRotation }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <ArrowLeftRight className="h-6 w-6" strokeWidth={3} />
                      </motion.div>
                    </Button>

                    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {isCfhToEur ? "Vous recevez" : "Vous envoyez"}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-white/10 font-semibold">
                            EU
                          </span>
                          EUR
                        </span>
                      </div>
                      <motion.div
                        animate={{ scale: pulseAnimation ? [1, 1.05, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                        className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                      >
                        {(amount * getDisplayRate(validatedExchanges[0]?.last_rate || officialRateRef)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </motion.div>
                    </div>
                  </div>

                  {/* Giant rate */}
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-white/5 pt-5">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Taux interbancaire · 1 {isCfhToEur ? 'CHF' : 'EUR'} =
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isCfhToEur + getDisplayRate(officialRateRef).toFixed(5)}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className="font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl"
                        >
                          {getDisplayRate(officialRateRef).toFixed(4)}
                          <span className="ml-2 text-xl font-medium text-muted-foreground">
                            {isCfhToEur ? "EUR" : "CHF"}
                          </span>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2 py-1.5 font-mono text-[11px] text-emerald-300">
                        <span className="uppercase tracking-[0.14em] text-muted-foreground">24h</span>
                        <span className="font-semibold">+0.34%</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2 py-1.5 font-mono text-[11px] text-rose-300">
                        <span className="uppercase tracking-[0.14em] text-muted-foreground">7j</span>
                        <span className="font-semibold">-0.18%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button 
                      onClick={() => setShowRouteModal(true)}
                      className="bg-emerald-400 hover:bg-emerald-300 text-background"
                    >
                      <Zap className="h-4 w-4 mr-2" strokeWidth={2.5} />
                      Exécuter la route optimale
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-white/10 bg-white/[0.03]"
                      onClick={() => setShowAlertModal(true)}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Définir une alerte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT - KPI stack */}
            <div className="grid grid-cols-2 gap-3 self-start lg:grid-cols-2">
              <Card className="bg-background/60 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-emerald-400/20 bg-emerald-400/5 text-emerald-300">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Meilleur taux du jour
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                    {getDisplayRate(validatedExchanges[0]?.last_rate || officialRateRef).toFixed(4)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {validatedExchanges[0]?.name || 'Chargement...'} · {lastScan}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-rose-400/20 bg-rose-400/5 text-rose-300">
                      <Shield className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Écart maximum
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                    2.00%
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {validatedExchanges[validatedExchanges.length - 1]?.name || 'Chargement...'}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-background/60 backdrop-blur-xl border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all duration-200"
                onMouseEnter={() => setShowTravelTooltip(true)}
                onMouseLeave={() => setShowTravelTooltip(false)}
              >
                <CardContent className="p-4 relative">
                  {showTravelTooltip && (
                    <div className="absolute right-0 top-0 z-[100] w-96 rounded-lg border border-emerald-400/30 bg-slate-900/95 backdrop-blur-xl p-4 text-xs text-white shadow-2xl">
                      <div className="space-y-3">
                        <div className="font-semibold text-emerald-300 text-sm">Détails du calcul logistique</div>
                        <div className="space-y-2 text-gray-300">
                          <div>• Trajet: Douvaine ↔ Genève (38km A/R)</div>
                          <div>• Consommation: {(AVG_CONSUMPTION * 100).toFixed(0)}L/100km à {GAS_PRICE_LITER} CHF/L</div>
                          <div>• Amortissement: +0.10 CHF/km (Usure/Pneus)</div>
                          <div>• Temps: 30 min estimées (Valorisées à 0.75 CHF/min)</div>
                          <div>• Marge d'erreur: +2 CHF (Stationnement/Imprévus)</div>
                          <div className="pt-2 border-t border-emerald-400/20">
                            <span className="text-emerald-300 font-semibold text-sm">Total: {TRAVEL_EXPENSE_TOTAL.toFixed(2)} CHF</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-blue-400/20 bg-blue-400/5 text-blue-300">
                      <Fuel className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Frais de trajet (A/R)
                    </span>
                    <div className="ml-auto">
                      <Info className="h-3 w-3 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                    {TRAVEL_EXPENSE_TOTAL.toFixed(2)} CHF
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Aller-retour GE ↔ Annemasse
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-emerald-400/20 bg-emerald-400/5 text-emerald-300">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Net pour {amount} CHF
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                    {((amount * getDisplayRate(validatedExchanges[0]?.last_rate || officialRateRef)) - TRAVEL_EXPENSE_TOTAL).toFixed(2)} EUR
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Après spreads et frais de trajet
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Provider List */}
        <div ref={providersRef} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
            <CardHeader className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                    Classement des bureaux
                  </span>
                </div>
                <CardTitle className="text-xl">
                  Bureaux classés par{" "}
                  <span className="underline decoration-emerald-400/40 decoration-2 underline-offset-4">
                    Profit Réel
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Net EUR sur une conversion de {amount} CHF · frais de trajet, spreads et commissions inclus.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  <Gauge className="h-3 w-3 mr-1" /> Tri: Profit Réel
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  Base: {amount} CHF
                </Badge>
              </div>
            </CardHeader>

            <div className="divide-y divide-white/5">
              {filteredExchanges.slice(0, showAll ? undefined : 3).map((ex, index) => {
                const displayRate = getDisplayRate(ex.last_rate);
                const refRate = getDisplayRate(officialRateRef);
                const currentSymbol = isCfhToEur ? 'EUR' : 'CHF';
                
                const fees = ex.fixed_fee || 0;
                const spreadMoney = Math.abs((displayRate - refRate) * amount);
                const minutesAgo = ex.update_at ? getMinutesAgo(ex.update_at) : NaN;
                const travelCosts = ex.type === 'physical' ? TRAVEL_EXPENSE_TOTAL : 0;
                const realProfit = ((displayRate - refRate) * amount) - travelCosts - fees;
                const isOutdated = !isNaN(minutesAgo) && minutesAgo > 65;
                const tips = formatSpecialConditions(ex.special_conditions);

                return (
                  <div key={ex.id} className={index === 0 ? "relative bg-emerald-400/[0.03]" : ""}>
                    {index === 0 && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent"
                      />
                    )}

                    <Button
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02] sm:px-6 h-auto justify-start"
                    >
                      {/* Rank */}
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border font-mono text-sm font-semibold tabular-nums ${
                          index === 0
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground"
                        }`}
                      >
                        {index === 0 ? <Crown className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}
                      </div>

                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-foreground">{ex.name}</span>
                          <Badge variant="outline" className="border-white/10 bg-white/5">
                            <Building2 className="h-2.5 w-2.5 mr-1" /> {ex.type}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 bg-white/5">
                            {ex.type === 'physical' ? 'FR' : 'CH'}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3 w-3" />
                            {ex.opening_hours || "24/7"}
                            <span
                              className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                                !isOutdated ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span className={!isOutdated ? "text-emerald-300" : "text-rose-300"}>
                              {!isOutdated ? "Live" : "Obsolète"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-300" />
                            4.5
                          </span>
                          <span>Liquidité · Élevée</span>
                        </div>
                      </div>

                      {/* Real profit */}
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Profit Réel
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className={`font-mono text-xl font-semibold tabular-nums tracking-tight ${
                              index === 0 ? "text-emerald-300" : "text-foreground"
                            }`}
                          >
                            {realProfit > 0 ? '+' : ''}{realProfit.toFixed(2)}
                            <span className="ml-1 text-xs font-medium text-muted-foreground">{currentSymbol}</span>
                          </div>
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? "bg-gradient-to-r from-emerald-400 to-emerald-300" : "bg-blue-400/60"
                            }`}
                            style={{ width: `${Math.max(8, (realProfit / Math.abs(realProfit || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: expandedId === ex.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-muted-foreground"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    </Button>

                    <AnimatePresence initial={false}>
                      {expandedId === ex.id && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4 border-t border-white/5 bg-black/30 px-5 py-5 sm:grid-cols-[1fr_1fr] sm:px-6">
                            <div>
                              <div className="mb-3 flex items-center gap-2">
                                <span className="grid h-6 w-6 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                                  <Sparkles className="h-3.5 w-3.5" />
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                                  Stratégie Élite
                                </span>
                                <span className="text-xs text-muted-foreground">- Conseils d'Expert</span>
                              </div>
                              <ul className="space-y-2">
                                {tips.length > 0 ? tips.slice(0, 2).map((tip, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-foreground/90"
                                  >
                                    <span className="mt-1 font-mono text-[10px] text-emerald-300">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="leading-6 text-pretty">"{tip}"</span>
                                  </li>
                                )) : (
                                  <li className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-foreground/90">
                                    <span className="mt-1 font-mono text-[10px] text-emerald-300">01</span>
                                    <span className="leading-6 text-pretty">Aucune condition spéciale disponible pour ce fournisseur.</span>
                                  </li>
                                )}
                              </ul>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                  Audit du Spread
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                      Spread fournisseur
                                    </div>
                                    <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                                      {spreadMoney.toFixed(2)}{currentSymbol}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                      Frais fixes
                                    </div>
                                    <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                                      {fees === 0 ? "aucun" : `${fees.toFixed(2)} CHF`}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                      Net du mid
                                    </div>
                                    <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${realProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                      {(((displayRate / getDisplayRate(officialRateRef)) - 1) * 100).toFixed(2)}%
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="text-xs text-muted-foreground border-t border-white/5 pt-2">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-emerald-300">Transparence:</span>
                                    <span>Taux net incluant commissions de change et frais logistiques déduits</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-blue-300">Source:</span>
                                    <span>Données récupérées via Scraper Automatisé {ex.name}</span>
                                  </div>
                                </div>
                                <Button 
                                  className="w-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg transition-all duration-200"
                                  onClick={() => handleProviderSiteClick(ex.name)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Effectuer via {ex.name.split(" ")[0]} & Accéder au site
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {filteredExchanges.length > 3 && (
              <div className="p-4">
                <Button
                  onClick={() => setShowAll(!showAll)}
                  variant="outline"
                  className="w-full border-white/10 bg-white/[0.03]"
                >
                  {showAll ? (
                    <>Afficher moins</>
                  ) : (
                    <>Voir les {filteredExchanges.length} bureaux</>
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* Volatility Chart */}
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-blue-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300">
                    Comparaison de volatilité
                  </span>
                </div>
                <CardTitle className="text-xl">
                  Taux effectif EUR/CHF par fournisseur
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Divergence intrajournalière des spreads par rapport au taux interbancaire. Plus serré est meilleur.
                </p>
              </div>
            </CardHeader>

            <div className="h-[320px] w-full px-6">
              {!dataSaver && rawHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillMid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="rgba(148,163,184,0.5)"
                      tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
                    />
                    <YAxis
                      domain={["dataMin - 0.002", "dataMax + 0.002"]}
                      stroke="rgba(148,163,184,0.5)"
                      tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => Number(v).toFixed(3)}
                      width={56}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <Card className="border-white/10 bg-background/90 px-3 py-2 font-mono text-[11px] shadow-2xl backdrop-blur-xl">
                            <div className="mb-1.5 text-muted-foreground">{label} CET</div>
                            <div className="space-y-1">
                              {payload.map((p) => (
                                <div key={String(p.dataKey)} className="flex items-center justify-between gap-6">
                                  <span className="inline-flex items-center gap-2 text-foreground/80">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                                    {String(p.dataKey)}
                                  </span>
                                  <span className="tabular-nums text-foreground">{Number(p.value).toFixed(4)}</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      }} 
                      cursor={{ stroke: "rgba(148,163,184,0.2)" }} 
                    />

                    {top5Names.map((name, i) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"][i]}
                        strokeWidth={i === 0 ? 2.25 : 1.75}
                        fill={["url(#fillMid)", "url(#fillBlue)", "url(#fillBlue)", "url(#fillBlue)", "url(#fillBlue)"][i]}
                        strokeDasharray={i === 0 ? "0" : i === 1 ? "4 4" : "2 4"}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                  <WifiOff size={32} className="mb-2 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {dataSaver ? "Graphique masqué (Éco-Data)" : "Chargement des données..."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4 px-6 pb-6 text-[11px]">
              {top5Names.map((name, i) => (
                <div key={name} className="inline-flex items-center gap-2 font-mono text-muted-foreground">
                  <span
                    className="h-0.5 w-6 rounded-full"
                    style={{
                      background: i === 0 ? "#10b981" : i === 1 ? "repeating-linear-gradient(90deg, #3b82f6 0 4px, transparent 4px 8px)" : i === 2 ? "repeating-linear-gradient(90deg, #f59e0b 0 2px, transparent 2px 6px)" : i === 3 ? "repeating-linear-gradient(90deg, #8b5cf6 0 2px, transparent 2px 6px)" : "repeating-linear-gradient(90deg, #ef4444 0 2px, transparent 2px 6px)",
                    }}
                  />
                  <span className="text-foreground/80">{name}</span>
                </div>
              ))}
              <span className="ml-auto inline-flex items-center gap-2 font-mono text-muted-foreground">
                Mise à jour en temps réel via Supabase
              </span>
            </div>
          </Card>
        </div>

        {/* Historique Section */}
        <div ref={historyRef} className="space-y-4">
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-blue-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300">
                  Historique des Taux
                </span>
              </div>
              <CardTitle className="text-xl">
                Derniers changements de taux
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Les 10 dernières variations enregistrées dans la base de données.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fournisseur</th>
                      <th className="text-right p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Taux CHF/EUR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateHistory.map((item, index) => (
                      <tr key={index} className="border-b border-white/5">
                        <td className="p-3 font-mono text-[11px] text-foreground">{item.time}</td>
                        <td className="p-3 text-foreground">{item.provider}</td>
                        <td className="p-3 text-right font-mono text-[11px] tabular-nums text-foreground">{item.rate.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertes Section */}
        <div ref={alertsRef} className="space-y-4">
          <Card className="border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                  Alertes de Taux
                </span>
              </div>
              <CardTitle className="text-xl">
                Notifications personnalisées
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Recevez des alertes par email lorsque les taux atteignent vos seuils préférés.
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez vos alertes pour ne jamais manquer une opportunité.
                </p>
                <Button 
                  onClick={() => setShowAlertModal(true)}
                  className="bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/15"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Configurer les alertes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <span className="font-mono uppercase tracking-[0.18em]">
            Terminal Frontalier · {new Date().getFullYear()}
          </span>
        </footer>
      </main>
    </div>
    
    {/* Route Optimization Modal */}
    <AnimatePresence>
      {showRouteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <Card className="w-full max-w-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-emerald-400/5">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-400/30 text-emerald-300">
                    <Zap className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div>
                    <CardTitle className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      Optimisation de l'itinéraire
                    </CardTitle>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                      Console logistique · v2.1
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowRouteModal(false)}
                  className="h-8 w-8 hover:bg-white/10 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Inputs Grid */}
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 flex items-center gap-2">
                      <Car className="h-3.5 w-3.5" />
                      Type de véhicule
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full h-10 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-mono text-foreground focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition-colors cursor-pointer appearance-none"
                      >
                        <option value="Citadine" className="bg-slate-900 text-foreground font-mono py-2 px-3">Citadine</option>
                        <option value="Berline" className="bg-slate-900 text-foreground font-mono py-2 px-3">Berline</option>
                        <option value="SUV" className="bg-slate-900 text-foreground font-mono py-2 px-3">SUV</option>
                        <option value="Utilitaire" className="bg-slate-900 text-foreground font-mono py-2 px-3">Utilitaire</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 flex items-center gap-2">
                      <Fuel className="h-3.5 w-3.5" />
                      Carburant
                    </label>
                    <div className="relative">
                      <select
                        value={fuelType}
                        onChange={(e) => setFuelType(e.target.value)}
                        className="w-full h-10 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-mono text-foreground focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition-colors cursor-pointer appearance-none"
                      >
                        <option value="E85" className="bg-slate-900 text-foreground font-mono py-2 px-3">E85: 0.819€</option>
                        <option value="E10" className="bg-slate-900 text-foreground font-mono py-2 px-3">E10: 1.969€</option>
                        <option value="SP98" className="bg-slate-900 text-foreground font-mono py-2 px-3">SP98: 2.099€</option>
                        <option value="Gazole" className="bg-slate-900 text-foreground font-mono py-2 px-3">Gazole: 2.169€</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Localisation actuelle
                    </label>
                    <div className="relative">
                      <select
                        value={currentLocation}
                        onChange={(e) => setCurrentLocation(e.target.value)}
                        className="w-full h-10 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-mono text-foreground focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition-colors cursor-pointer appearance-none"
                      >
                        <option value="Douvaine" className="bg-slate-900 text-foreground font-mono py-2 px-3">Douvaine</option>
                        <option value="Annemasse" className="bg-slate-900 text-foreground font-mono py-2 px-3">Annemasse</option>
                        <option value="Thonon" className="bg-slate-900 text-foreground font-mono py-2 px-3">Thonon</option>
                        <option value="Evian" className="bg-slate-900 text-foreground font-mono py-2 px-3">Evian</option>
                        <option value="Veigy-foncenex" className="bg-slate-900 text-foreground font-mono py-2 px-3">Veigy-Foncenex</option>
                        <option value="messery" className="bg-slate-900 text-foreground font-mono py-2 px-3">Messery</option>
                        <option value="yvoire" className="bg-slate-900 text-foreground font-mono py-2 px-3">Yvoire</option>
                        <option value="nernier" className="bg-slate-900 text-foreground font-mono py-2 px-3">Nernier</option>
                        <option value="saint julien en genevois" className="bg-slate-900 text-foreground font-mono py-2 px-3">Saint-Julien-en-Genevois</option>
                        <option value="ambilly" className="bg-slate-900 text-foreground font-mono py-2 px-3">Ambilly</option>
                        <option value="ville la grand" className="bg-slate-900 text-foreground font-mono py-2 px-3">Ville-la-Grand</option>
                        <option value="cruseilles" className="bg-slate-900 text-foreground font-mono py-2 px-3">Cruseilles</option>
                        <option value="ferney voltaire" className="bg-slate-900 text-foreground font-mono py-2 px-3">Ferney-Voltaire</option>
                        <option value="saint genis puilly" className="bg-slate-900 text-foreground font-mono py-2 px-3">Saint-Genis-Pouilly</option>
                        <option value="gex" className="bg-slate-900 text-foreground font-mono py-2 px-3">Gex</option>
                        <option value="divonne" className="bg-slate-900 text-foreground font-mono py-2 px-3">Divonne</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
            
            {/* Actions */}
            <div className="space-y-4">
              <Button
                onClick={calculateRouteCost}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-background hover:from-emerald-400 hover:to-emerald-300 py-3 font-mono text-sm uppercase tracking-[0.14em] shadow-lg shadow-emerald-400/20 transition-all"
              >
                <Zap className="h-4 w-4 mr-2" strokeWidth={2.5} />
                Calculer le coût réel
              </Button>
              
              {calculatedCost > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] p-5"
                >
                  <div className="text-center space-y-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
                      Coût Total Estimé
                    </div>
                    <div className="font-mono text-4xl font-bold text-emerald-300 tabular-nums tracking-tight">
                      {calculatedCost.toFixed(2)}
                      <span className="text-lg ml-1 text-emerald-300/70">€</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                      <span>Trajet A/R</span>
                      <span className="text-white/10">·</span>
                      <span>Amortissement inclus</span>
                      <span className="text-white/10">·</span>
                      <span>Temps valorisé</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={openWazeTraffic}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:from-blue-400 hover:to-blue-300 shadow-lg shadow-blue-400/20 transition-all"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Vérifier le trafic sur Waze
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRouteModal(false)}
                  className="border-white/10 bg-white/[0.03] hover:bg-white/[0.08] font-mono text-xs uppercase tracking-[0.14em]"
                >
                  Fermer
                </Button>
              </div>
            </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Alert Modal */}
    <AnimatePresence>
      {showAlertModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-background p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Alerte de taux</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlertModal(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAlertSubmit}
                  className="flex-1 bg-emerald-400 text-white hover:bg-emerald-500"
                >
                  S'abonner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAlertModal(false)}
                  className="border-white/10 bg-white/[0.03]"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);
}

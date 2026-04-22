import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

const GLOBAL_ID = '5537b916-006d-4ad5-b84f-869e6175e99c'; 

async function scrapeGlobalExchange() {
  console.log("🚀 Iniciando Global Exchange (Versión Final)...");
  
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // PASO 1: CARGA DIRECTA
    console.log("📡 Navegando a la calculadora...");
    await page.goto('https://www.globalexchange.es/cambio-moneda', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Limpieza de modales y banners
    await page.evaluate(() => {
      const selectors = ['#onetrust-banner-sdk', '.cookie-banner', '.Modal-main', '.Modal-legal', '.modal-backdrop'];
      selectors.forEach(s => document.querySelector(s)?.remove());
    });

    // PASO 2: SELECCIONAR CHF
    console.log("🖱️ Abriendo selector de divisas...");
    // El trigger verificado es .CurrencySelect-optionSelected
    const trigger = page.locator('.CurrencySelect-optionSelected').first();
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click({ force: true });
    
    console.log("⌨️ Escribiendo 'chf'...");
    // El buscador aparece como un input con placeholder o clase específica
    const searchInput = page.locator('input[placeholder*="moneda" i], .Input-element').first();
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill('chf');
    await page.waitForTimeout(2000);

    console.log("✅ Seleccionando segunda opción (Suiza)...");
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // PASO 3: EXTRACCIÓN
    console.log("⏳ Esperando actualización del precio...");
    await page.waitForTimeout(5000);

    const bodyText = await page.innerText('body');
    // Buscamos el patrón "1 EUR = X,XXXXXX CHF"
    const rateRegex = /1\s?EUR\s?=\s?(\d+[.,]\d+)\s?CHF/i;
    const match = bodyText.match(rateRegex);

    if (match && match[1]) {
      const eurToChf = parseFloat(match[1].replace(',', '.'));
      // Invertimos para obtener 1 CHF -> EUR
      const rateChfEur = parseFloat((1 / eurToChf).toFixed(6));
      
      console.log(`🎯 Tasa Localizada: 1 EUR = ${eurToChf} CHF`);
      console.log(`🎯 Tasa Calculada: 1 CHF = ${rateChfEur} EUR`);

      // ACTUALIZACIÓN SUPABASE
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ last_rate: rateChfEur, update_at: new Date().toISOString() })
        .eq('id', GLOBAL_ID);

      const { error: insertError } = await supabase
        .from('exchange_rates')
        .insert({ exchange_id: GLOBAL_ID, rate_chf_eur: rateChfEur });

      if (!updateError && !insertError) {
        console.log("🚀 Base de datos sincronizada correctamente.");
      } else {
        console.error("❌ Error de sincronización:", updateError || insertError);
      }
    } else {
      console.error("❌ No se encontró la tasa en el DOM. Revisa la captura DEBUG_GLOBAL.png");
      await page.screenshot({ path: 'DEBUG_GLOBAL.png' });
    }

  } catch (err: any) {
    console.error("❌ Fallo en el proceso:", err.message);
    await page.screenshot({ path: 'ERROR_GLOBAL_FINAL.png' });
  } finally {
    await browser.close();
  }
}

scrapeGlobalExchange();

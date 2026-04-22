import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

const CHANGEGROUP_ID = '34fde1ce-c842-4b69-84c7-380b1923c1f3'; 

async function scrapeChangeGroup() {
  console.log("🚀 Mission ChangeGroup : Démarrage...");
  const browser = await chromium.launch({ headless: true }); 
  const page = await browser.newPage();

  try {
    // 1. CARGA DE PÁGINA (Esperar 3s según instrucciones)
    await page.goto('https://fr.changegroup.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. PEQUEÑO SCROLL PARA CENTRAR CALCULADORA
    await page.evaluate(() => window.scrollBy(0, 350));
    await page.waitForTimeout(500);

    // 3. BUSCAR "DOLLAR" Y CLIC EN EL CONTENEDOR (Inmune a capas invisibles)
    console.log("Buscando selector con texto 'Dollar'...");
    const dollarElement = page.locator('text=/Dolar|Dollar/i').first();
    
    // Forzamos el clic a través de la evaluación del elemento para evitar errores de visibilidad
    await dollarElement.evaluate(el => {
        const clickable = el.closest('button') || el.closest('div') || el;
        (clickable as HTMLElement).click();
    });
    console.log("✅ Selector de moneda abierto");

    // 4. ESCRIBIR "CH" Y SELECCIONAR CON TECLADO
    await page.waitForTimeout(500);
    await page.keyboard.type('ch', { delay: 150 });
    await page.waitForTimeout(1200); // Esperar que la web procese la búsqueda
    
    // Bajamos a la primera sugerencia y damos Enter para validar Suiza/CHF
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    console.log("✅ CHF seleccionado y validado");

    // 5. ESPERAR 1.5s PARA QUE EL PRECIO SE ACTUALICE Y CAPTURAR
    await page.waitForTimeout(1500);
    const screenshotPath = 'changegroup_capture.png';
    await page.screenshot({ path: screenshotPath });
    console.log("📸 Capture d'écran effectuée");

    // 6. EXTRACCIÓN OCR Y LÓGICA DE INVERSIÓN
    console.log("Leyendo datos con OCR...");
    const { data: { text } } = await Tesseract.recognize(screenshotPath, 'fra');
    
    // Buscamos el patrón numérico (1 EUR = X.XXXX)
    const matches = text.match(/(\d+[.,]\d{3,4})/);

    if (matches && matches[1]) {
      const rateEURCHF = parseFloat(matches[1].replace(',', '.'));
      
      // LÓGICA DE INVERSIÓN: Para obtener 1 CHF = X EUR
      const finalRate = parseFloat((1 / rateEURCHF).toFixed(4));
      
      console.log(`📊 Taux Lu (EUR/CHF): ${rateEURCHF}`);
      console.log(`✅ Taux Final (CHF/EUR): ${finalRate}`);

      // 7. ACTUALIZACIÓN DE BASE DE DATOS
      const { error: updateError } = await supabase
        .from('exchanges')
        .update({ 
            last_rate: finalRate, 
            update_at: new Date().toISOString() 
        })
        .eq('id', CHANGEGROUP_ID);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from('exchange_rates')
        .insert({ 
            exchange_id: CHANGEGROUP_ID, 
            rate_chf_eur: finalRate 
        });

      if (insertError) throw insertError;

      console.log("🚀 Base de données mise à jour avec succès.");
      
    } else {
      console.log("❌ OCR no detectó el número. Revisa 'changegroup_capture.png'");
    }

  } catch (error) {
    console.error("❌ Error crítico en el proceso:", error);
  } finally {
    await browser.close();
  }
}

scrapeChangeGroup();
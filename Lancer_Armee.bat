@echo off
title SECTEUR 13 - RADAR CHF/EUR
echo [SYSTEME] Initialisation de l'armee de scrapers...
echo.

:: Liste exhaustive de tes 13 soldats
:: Note : J'ai inclus ceux visibles sur ta capture et ceux que tu as cités.
set scrapers=bcge_scraper.ts migros_scraper.ts bsharpe_scraper.ts baloise_scraper.ts ibani_scraper.ts lyland_scraper.ts telexoo_scraper.ts revolut_scraper.ts wise_scraper.ts change_leman_scraper.ts ubs_scraper.ts raiffeisen_scraper.ts bcv_scraper.ts

for %%i in (%scrapers%) do (
    echo [LANCEMENT] %%i...
    :: Lancement via npx tsx en mode fenetre separee
    start "Robot %%i" npx tsx services/scrapers/%%i
)

echo.
echo [SUCCES] Les 13 robots sont en cours d'execution.
echo Garde les fenetres ouvertes pour maintenir le scan live.
pause
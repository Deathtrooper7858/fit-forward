const fs = require('fs');

const langs = ['fr', 'pt', 'it', 'de', 'ru'];

const trackerTranslations = {
  fr: {
    "title": "Aujourd'hui",
    "summary": "Résumé",
    "addFood": "+ Ajouter Aliment",
    "water": "Eau",
    "glasses": "Verres",
    "planEmptyTitle": "Prêt pour une nouvelle journée ?",
    "planEmptySub": "Commencez à suivre vos repas ou laissez l'IA créer un plan.",
    "generatePlan": "Générer un Plan",
    "nutrients": "Nutriments",
    "otherNutrients": "Autres nutriments",
    "activity": "Activité",
    "activitySub": "Gagnez des calories en bougeant",
    "neat": "NEAT",
    "neatSub": "Mouvement quotidien",
    "exercise": "Exercice",
    "exerciseSub": "Entraînement actif",
    "steps": "Pas",
    "kcal": "kcal",
    "remaining": "restant",
    "consumed": "consommé",
    "burned": "brûlé"
  },
  pt: {
    "title": "Hoje",
    "summary": "Resumo",
    "addFood": "+ Adicionar Alimento",
    "water": "Água",
    "glasses": "Copos",
    "planEmptyTitle": "Pronto para um novo dia?",
    "planEmptySub": "Comece a monitorar suas refeições ou deixe a IA criar um plano.",
    "generatePlan": "Gerar Plano",
    "nutrients": "Nutrientes",
    "otherNutrients": "Outros nutrientes",
    "activity": "Atividade",
    "activitySub": "Ganhe calorias se movendo",
    "neat": "NEAT",
    "neatSub": "Movimento diário",
    "exercise": "Exercício",
    "exerciseSub": "Treino ativo",
    "steps": "Passos",
    "kcal": "kcal",
    "remaining": "restante",
    "consumed": "consumido",
    "burned": "queimado"
  },
  it: {
    "title": "Oggi",
    "summary": "Riepilogo",
    "addFood": "+ Aggiungi Cibo",
    "water": "Acqua",
    "glasses": "Bicchieri",
    "planEmptyTitle": "Pronto per un nuovo giorno?",
    "planEmptySub": "Inizia a monitorare i tuoi pasti o lascia che l'IA crei un piano.",
    "generatePlan": "Genera Piano",
    "nutrients": "Nutrienti",
    "otherNutrients": "Altri nutrienti",
    "activity": "Attività",
    "activitySub": "Guadagna calorie muovendoti",
    "neat": "NEAT",
    "neatSub": "Movimento quotidiano",
    "exercise": "Esercizio",
    "exerciseSub": "Allenamento attivo",
    "steps": "Passi",
    "kcal": "kcal",
    "remaining": "rimanente",
    "consumed": "consumato",
    "burned": "bruciato"
  },
  de: {
    "title": "Heute",
    "summary": "Zusammenfassung",
    "addFood": "+ Essen hinzufügen",
    "water": "Wasser",
    "glasses": "Gläser",
    "planEmptyTitle": "Bereit für einen neuen Tag?",
    "planEmptySub": "Verfolge deine Mahlzeiten oder lass die KI einen Plan erstellen.",
    "generatePlan": "Plan erstellen",
    "nutrients": "Nährstoffe",
    "otherNutrients": "Weitere Nährstoffe",
    "activity": "Aktivität",
    "activitySub": "Verdiene Kalorien durch Bewegung",
    "neat": "NEAT",
    "neatSub": "Tägliche Bewegung",
    "exercise": "Training",
    "exerciseSub": "Aktives Training",
    "steps": "Schritte",
    "kcal": "kcal",
    "remaining": "übrig",
    "consumed": "konsumiert",
    "burned": "verbrannt"
  },
  ru: {
    "title": "Сегодня",
    "summary": "Сводка",
    "addFood": "+ Добавить еду",
    "water": "Вода",
    "glasses": "Стаканы",
    "planEmptyTitle": "Готовы к новому дню?",
    "planEmptySub": "Начните отслеживать еду или позвольте ИИ составить план.",
    "generatePlan": "Создать план",
    "nutrients": "Питательные вещества",
    "otherNutrients": "Другие нутриенты",
    "activity": "Активность",
    "activitySub": "Зарабатывайте калории в движении",
    "neat": "NEAT",
    "neatSub": "Дневное движение",
    "exercise": "Тренировка",
    "exerciseSub": "Активная тренировка",
    "steps": "Шаги",
    "kcal": "ккал",
    "remaining": "осталось",
    "consumed": "потреблено",
    "burned": "сожжено"
  }
};

for (const lang of langs) {
  const current = JSON.parse(fs.readFileSync('./i18n/translations/' + lang + '.json', 'utf8'));
  
  if (trackerTranslations[lang]) {
    // Preserve any existing keys not defined in my block
    current.tracker = { ...current.tracker, ...trackerTranslations[lang] };
  }

  fs.writeFileSync('./i18n/translations/' + lang + '.json', JSON.stringify(current, null, 2));
}

console.log('Translated tracker for all files');

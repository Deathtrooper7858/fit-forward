const fs = require('fs');

const en = JSON.parse(fs.readFileSync('./i18n/translations/en.json', 'utf8'));
const langs = ['fr', 'pt', 'it', 'de', 'ru'];

// Translations for welcome section
const welcomeTranslations = {
  fr: {
    "motto": "Fit-Go: Votre meilleure version",
    "tagline": "Votre coach et nutritionniste au même endroit.",
    "feature1": "Suivi Alimentaire Intelligent",
    "feature2": "Coach Nutritionnel IA",
    "feature3": "Composition Corporelle",
    "feature4": "Planificateur de Repas",
    "getStarted": "Commencer — C'est Gratuit",
    "haveAccount": "J'ai déjà un compte",
    "legal": "En continuant, vous acceptez nos Conditions d'Utilisation et notre Politique de Confidentialité."
  },
  pt: {
    "motto": "Fit-Go: A sua melhor versão",
    "tagline": "Seu coach e nutricionista em um só lugar.",
    "feature1": "Rastreamento Inteligente de Alimentos",
    "feature2": "Coach Nutricional com IA",
    "feature3": "Composição Corporal",
    "feature4": "Planejador de Refeições",
    "getStarted": "Começar — É Grátis",
    "haveAccount": "Eu já tenho uma conta",
    "legal": "Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade."
  },
  it: {
    "motto": "Fit-Go: La tua migliore versione",
    "tagline": "Il tuo coach e nutrizionista in un unico posto.",
    "feature1": "Tracciamento Alimentare Intelligente",
    "feature2": "Coach Nutrizionale IA",
    "feature3": "Composizione Corporea",
    "feature4": "Pianificatore di Pasti",
    "getStarted": "Inizia — È Gratis",
    "haveAccount": "Ho già un account",
    "legal": "Continuando accetti i nostri Termini di Servizio e la Privacy Policy."
  },
  de: {
    "motto": "Fit-Go: Deine beste Version",
    "tagline": "Dein Coach und Ernährungsberater an einem Ort.",
    "feature1": "Intelligentes Food-Tracking",
    "feature2": "KI Ernährungs-Coach",
    "feature3": "Körperzusammensetzung",
    "feature4": "Mahlzeitenplaner",
    "getStarted": "Loslegen — Es ist kostenlos",
    "haveAccount": "Ich habe bereits ein Konto",
    "legal": "Mit dem Fortfahren akzeptieren Sie unsere Nutzungsbedingungen und Datenschutzrichtlinie."
  },
  ru: {
    "motto": "Fit-Go: Твоя лучшая версия",
    "tagline": "Твой тренер и диетолог в одном месте.",
    "feature1": "Умное отслеживание еды",
    "feature2": "ИИ-Тренер по питанию",
    "feature3": "Состав тела",
    "feature4": "Планировщик питания",
    "getStarted": "Начать — Это бесплатно",
    "haveAccount": "У меня уже есть аккаунт",
    "legal": "Продолжая, вы соглашаетесь с нашими Условиями обслуживания и Политикой конфиденциальности."
  }
};

for (const lang of langs) {
  const current = JSON.parse(fs.readFileSync('./i18n/translations/' + lang + '.json', 'utf8'));
  
  // Merge missing root keys from English
  for (const key in en) {
    if (!current[key]) {
      current[key] = en[key];
    } else if (typeof en[key] === 'object') {
      // Merge sub-keys
      for (const subKey in en[key]) {
        if (current[key][subKey] === undefined) {
          current[key][subKey] = en[key][subKey];
        }
      }
    }
  }

  // Override welcome section with actual translations
  if (welcomeTranslations[lang]) {
    current.welcome = welcomeTranslations[lang];
  }

  fs.writeFileSync('./i18n/translations/' + lang + '.json', JSON.stringify(current, null, 2));
}

console.log('Merged English keys and translated welcome section for all files');

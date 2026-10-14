# NunciaYa

A bilingual (English/Spanish) classifieds platform for Costa Rica, built with Firebase, Algolia, and vanilla JavaScript.

## 🚀 Features

- **Bilingual Support**: Full English and Spanish interface
- **Search**: Fast search powered by Algolia
- **Categories**: Housing, For Sale, Jobs, Services, Community, Personals
- **Location-based**: Filter by Province, Canton, and District
- **User Accounts**: Post ads, manage listings, save favorites
- **Image Upload**: Support for multiple images per listing

## 📁 Project Structure

```
NunicaYa/
├── index.html              # Homepage
├── app.js                  # Core application logic (Firebase init, components)
├── config.js               # Centralized configuration (API keys)
├── style.css               # Custom styles
├── locations-cr.js        # Costa Rica location data
├── _header.html            # Reusable header component
├── _footer.html            # Reusable footer component
├── post-ad.html            # Post/edit listing form
├── listing-search.html     # Search results page
├── pages/                  # Category pages
│   ├── housing/
│   ├── For Sale/
│   ├── Jobs/
│   ├── Services/
│   ├── Community/
│   └── Personals/
├── functions/              # Firebase Cloud Functions
│   ├── index.js            # Algolia sync & cleanup functions
│   └── package.json
└── open-vehicle-db/        # Vehicle database data
```

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS (Tailwind), Vanilla JavaScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Search**: Algolia
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions (Node.js 20)

## 📋 Prerequisites

- Node.js 20+ (for Cloud Functions)
- Firebase CLI
- Firebase project with:
  - Authentication enabled
  - Firestore database
  - Storage bucket
  - Cloud Functions enabled
- Algolia account with an index named "listings"

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd NunicaYa
```

### 2. Install dependencies

```bash
# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 3. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication, Firestore, Storage, and Functions
3. Update `config.js` with your Firebase configuration
4. Update `app.js` with your Firebase config (or use `config.js`)

### 4. Configure Algolia

1. Create an Algolia account and index named "listings"
2. Update `config.js` with your Algolia credentials
3. Set environment variables for Cloud Functions:

```bash
firebase functions:config:set algolia.app_id="YOUR_APP_ID" algolia.api_key="YOUR_ADMIN_KEY"
```

### 5. Deploy Cloud Functions

```bash
cd functions
npm run deploy
# or: firebase deploy --only functions
```

### 6. Run locally (optional)

For local development, you can use Firebase Hosting emulator:

```bash
firebase emulators:start
```

Or simply open HTML files in a browser (some features require Firebase to be deployed).

## 📝 Development

### Code Style

The project uses:
- **ESLint** for linting (`.eslintrc.json`)
- **Prettier** for formatting (`.prettierrc.json`)
- **EditorConfig** for editor settings (`.editorconfig`)

### Running Linter

```bash
# Install ESLint globally or use npx
npx eslint . --ext .js,.html
```

### Project Conventions

- **Path Prefixes**: Pages use relative paths. Root pages use `./`, nested pages use `../../`
- **Language Toggle**: Use `lang-en` and `lang-es` classes with `window.setLang()`
- **Component Loading**: Header/footer loaded via `window.loadComponents(pathPrefix)`
- **Firebase**: Uses compat SDKs loaded via script tags

See `.github/copilot-instructions.md` for detailed development guidelines.

## 🔧 Configuration

### API Keys

All API keys are centralized in `config.js`. This file should be:
- **Committed to git** (keys are safe for client-side use)
- **Updated** when keys need to be rotated
- **Referenced** by all pages instead of hardcoding

### Environment Variables (Cloud Functions)

Cloud Functions use environment variables for sensitive keys:

```bash
# Set Algolia credentials
firebase functions:config:set algolia.app_id="YOUR_APP_ID" algolia.api_key="YOUR_ADMIN_KEY"

# View current config
firebase functions:config:get
```

## 📦 Deployment

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Deploy Cloud Functions

```bash
cd functions
npm run deploy
```

### Deploy Everything

```bash
firebase deploy
```

## 🧪 Testing

Currently, the project doesn't have automated tests. See `IMPROVEMENTS.md` for recommendations on adding testing infrastructure.

## 📚 Documentation

- **IMPROVEMENTS.md**: List of potential improvements and recommendations
- **.github/copilot-instructions.md**: Detailed development guidelines for AI assistants
- **config.js**: Centralized configuration documentation

## 🤝 Contributing

1. Follow the code style (ESLint + Prettier)
2. Update documentation as needed
3. Test your changes locally
4. Submit a pull request

## 📄 License

[Add your license here]

## 🐛 Known Issues

- Large HTML files with inline JavaScript (see IMPROVEMENTS.md)
- API keys duplicated across multiple files (partially addressed with config.js)
- No automated testing

## 🔮 Future Improvements

See `IMPROVEMENTS.md` for a comprehensive list of potential improvements including:
- Code organization and modularization
- Build process and bundling
- Testing infrastructure
- Performance optimizations
- Security enhancements
- Accessibility improvements

---

**Note**: This is a static site with Firebase backend. No build step is currently required, but it's recommended for production (see IMPROVEMENTS.md).

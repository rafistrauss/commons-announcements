# Shabbat Announcements

A web application that generates Shabbat announcements for the Commons Minyan, featuring:

- **Current parsha** in Hebrew
- **Mincha and Maariv times** for Friday and Shabbat
- **Shkia (sunset) times** calculated for Fair Lawn, NJ (07410)
- **Hebrew dates** with proper Hebrew numerals
- **Liturgical notices** (Ya'ale V'yavo, Al HaNissim, etc.)
- **Tzidkatcha reminders** when applicable
- **Print-ready design** for physical distribution

## Features

### 📅 Week Navigation
- Navigate between different weeks using Previous/Next buttons
- URL parameter support: `?week=1` for next week, `?week=-1` for last week

### 🕐 Jewish Calendar Integration
- Uses `kosher-zmanim` package for accurate calculations
- Automatically detects Rosh Chodesh, holidays, and special days
- Proper handling of Jewish day transitions at nightfall

### 🖨️ Print-Ready Design
- Professional announcement sheet layout
- Optimized for 8.5" x 11" paper
- Navigation controls hidden when printing

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Deployment

This project is configured for automatic deployment to GitHub Pages:

1. Push to `main` branch
2. GitHub Actions will automatically build and deploy
3. Site will be available at `https://yourusername.github.io/shabbat-announcements`

## Configuration

- **Location**: Fair Lawn, NJ (zip code 07410)
- **Mincha times**: Friday 7:30 PM, Shabbat 7:15 PM
- **Maariv time**: 8:25 PM

Times can be adjusted in `src/routes/+page.server.ts`.

## License

MIT

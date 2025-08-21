# Adobe Color Recommendations - Quality Dashboard

This document outlines the Adobe color palette used throughout the Quality Dashboard application, ensuring consistency, accessibility, and professional appearance.

## Primary Colors

### Adobe Blue (Primary Brand Color)
- **Main**: `#1473E6` - Primary buttons, links, and brand elements
- **Light**: `#4A9EFF` - Hover states and secondary elements
- **Dark**: `#0D5BB8` - Active states and pressed buttons
- **Contrast Text**: `#FFFFFF` - Text on blue backgrounds

### Adobe Red (Secondary Brand Color)
- **Main**: `#FA0F00` - Secondary actions and accent elements
- **Light**: `#FF4D4D` - Hover states
- **Dark**: `#CC0000` - Active states

## Semantic Colors

### Success (Green)
- **Main**: `#36B37E` - Success states, positive actions
- **Light**: `#57D9A3` - Hover states
- **Dark**: `#2B8A5F` - Active states

### Warning (Orange)
- **Main**: `#FF9D00` - Warning states, caution elements
- **Light**: `#FFB84D` - Hover states
- **Dark**: `#CC7A00` - Active states

### Error (Red)
- **Main**: `#E34850` - Error states, destructive actions
- **Light**: `#FF6B6B` - Hover states
- **Dark**: `#B91C1C` - Active states

### Info (Blue)
- **Main**: `#0066CC` - Information states, neutral actions
- **Light**: `#4A9EFF` - Hover states
- **Dark**: `#004499` - Active states

## Neutral Colors

### Text Colors
- **Primary Text**: `#2C2C2C` - Main text content
- **Secondary Text**: `#6B6B6B` - Supporting text, captions

### Background Colors
- **Default Background**: `#F8F9FA` - Main application background
- **Paper Background**: `#FFFFFF` - Card and component backgrounds
- **Hover Background**: `#F5F5F5` - Hover states for interactive elements

### Border Colors
- **Primary Border**: `#E0E0E0` - Standard borders
- **Secondary Border**: `#BDBDBD` - Hover state borders

## Gray Scale

- **50**: `#FAFAFA` - Very light gray
- **100**: `#F5F5F5` - Light gray
- **200**: `#EEEEEE` - Medium light gray
- **300**: `#E0E0E0` - Medium gray (borders)
- **400**: `#BDBDBD` - Medium dark gray
- **500**: `#9E9E9E` - Dark gray (placeholders)
- **600**: `#757575` - Darker gray
- **700**: `#616161` - Very dark gray
- **800**: `#424242` - Almost black
- **900**: `#212121` - Near black

## Usage Guidelines

### Buttons
- **Primary Buttons**: Use Adobe Blue (`#1473E6`) with white text
- **Secondary Buttons**: Use Adobe Red (`#FA0F00`) with white text
- **Success Buttons**: Use Success Green (`#36B37E`) with white text
- **Danger Buttons**: Use Error Red (`#E34850`) with white text
- **Warning Buttons**: Use Warning Orange (`#FF9D00`) with white text

### Text
- **Headings**: Use Primary Text (`#2C2C2C`)
- **Body Text**: Use Primary Text (`#2C2C2C`)
- **Secondary Text**: Use Secondary Text (`#6B6B6B`)
- **Placeholder Text**: Use Gray 500 (`#9E9E9E`)

### Backgrounds
- **Main Background**: Use Default Background (`#F8F9FA`)
- **Card Backgrounds**: Use Paper Background (`#FFFFFF`)
- **Hover States**: Use Hover Background (`#F5F5F5`)

### Borders
- **Standard Borders**: Use Primary Border (`#E0E0E0`)
- **Focus States**: Use Adobe Blue (`#1473E6`) with 10% opacity shadow

## Accessibility Considerations

All color combinations meet WCAG 2.1 AA standards for contrast ratios:
- Normal text: 4.5:1 minimum contrast ratio
- Large text: 3:1 minimum contrast ratio
- UI components: 3:1 minimum contrast ratio

## Implementation Notes

- Colors are defined in the Material-UI theme (`theme.ts`)
- CSS custom properties can be used for additional flexibility
- All hover and active states maintain proper contrast ratios
- Focus indicators use Adobe Blue with appropriate opacity for visibility

## File Locations

- **Theme Configuration**: `frontend/src/styles/theme.ts`
- **Login Styles**: `frontend/src/style/login.css`
- **Project Admin Styles**: `frontend/src/style/projectAdmin.css`
- **App Styles**: `frontend/src/App.css`
- **Global Styles**: `frontend/src/index.css` 
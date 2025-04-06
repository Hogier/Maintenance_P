# Materials Module Documentation

## Overview

The Materials Module provides functionality for managing and ordering maintenance supplies. It allows users to browse available materials, add them to a cart, and submit orders for approval.

## Files

- `materials.php` - PHP backend for handling material-related actions
- `materials.js` - JavaScript client-side code for the materials interface
- `materials.css` - Styling for the materials module
- `sql/materials_table.sql` - SQL for creating the database tables
- `sql/materials_table_english.sql` - Updated SQL with English material names

## Database Structure

The module uses three main tables:

- `materials` - Stores material information (name, category, description, unit)
- `material_orders` - Stores order information (user, date, status, notes)
- `material_order_items` - Links materials to orders with quantities

## Features

1. **Material Browsing**: Users can view all available materials with filtering by category
2. **Search**: Search functionality with auto-complete suggestions
3. **Cart System**: Add items to cart with quantity selection
4. **Order Management**: Submit orders and view order history
5. **Order Status**: Track orders through statuses (pending, approved, rejected, delivered)

## JavaScript API

The main functions in `materials.js` include:

- `initMaterialsModule()` - Initializes the materials module
- `loadMaterialsContent()` - Loads the materials interface
- `loadMaterials(category)` - Loads materials, optionally filtered by category
- `searchMaterials(query)` - Searches for materials
- `addToCart(id, name, unit, quantity)` - Adds an item to the cart
- `submitOrder()` - Submits the current cart as an order

## PHP API Endpoints

All requests to `materials.php` use POST with a `materials_action` parameter:

- `getAllMaterials` - Returns all materials (optional category filter)
- `searchMaterials` - Searches materials by name/description
- `createOrder` - Creates a new order from cart items
- `getUserOrders` - Gets orders for the current user
- `getOrderDetails` - Gets detailed information about an order

## Usage

1. The materials section can be accessed from the sidebar in `tasks.html`
2. Users can browse materials by category or search for specific items
3. Items can be added to cart with quantity selection
4. The cart button in the header opens the cart modal
5. Orders can be submitted from the cart modal with optional notes
6. Previous orders are displayed at the bottom of the materials page

## Setup

1. Import the SQL schema from `sql/materials_table_english.sql`
2. Ensure the database connection in `database.php` is configured correctly

## Troubleshooting

- If JSON parsing errors occur, check that `materials.php` is returning valid JSON responses
- Ensure the `materials_action` parameter is being properly passed in all requests
- Check browser console for any JavaScript errors

## Notes

- The module was initially developed with Russian text, then translated to English
- The mini-cart in the sidebar allows direct access to the cart without loading the full materials page

-- SQL script to update materials table with English translations

-- Update Toilet Paper
UPDATE materials SET 
    name = 'Toilet Paper', 
    description = 'Standard toilet paper rolls', 
    unit = 'rolls' 
WHERE id = 1;

-- Update Paper Towels
UPDATE materials SET 
    name = 'Paper Towels', 
    description = 'Kitchen paper towels', 
    unit = 'rolls' 
WHERE id = 2;

-- Update Hand Soap
UPDATE materials SET 
    name = 'Hand Soap', 
    description = 'Bathroom hand soap', 
    unit = 'bottles' 
WHERE id = 3;

-- Update Dish Soap
UPDATE materials SET 
    name = 'Dish Soap', 
    description = 'Dishwashing liquid', 
    unit = 'bottles' 
WHERE id = 4;

-- Update Laundry Detergent
UPDATE materials SET 
    name = 'Laundry Detergent', 
    description = 'Standard laundry detergent', 
    unit = 'boxes' 
WHERE id = 5;

-- Update Disinfectant Spray
UPDATE materials SET 
    name = 'Disinfectant Spray', 
    description = 'Surface disinfectant spray', 
    unit = 'bottles' 
WHERE id = 6;

-- Update Hand Sanitizer
UPDATE materials SET 
    name = 'Hand Sanitizer', 
    description = 'Alcohol-based hand sanitizer', 
    unit = 'bottles' 
WHERE id = 7;

-- Update Facial Tissues
UPDATE materials SET 
    name = 'Facial Tissues', 
    description = 'Facial tissue boxes', 
    unit = 'boxes' 
WHERE id = 8;

-- Update Paper Napkins
UPDATE materials SET 
    name = 'Paper Napkins', 
    description = 'Paper napkins for dining', 
    unit = 'packs' 
WHERE id = 9;

-- Update Whiteboard Cleaner
UPDATE materials SET 
    name = 'Whiteboard Cleaner', 
    description = 'Whiteboard cleaning solution', 
    unit = 'bottles' 
WHERE id = 10; 
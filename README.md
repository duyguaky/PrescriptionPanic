# Prescription Panic: Pharmacy Challenge

Prescription Panic is a 2D pharmacy simulation game developed using HTML5 Canvas, CSS, and JavaScript.  
The player controls a pharmacist and tries to deliver the correct medicines to patients before their waiting time runs out.

## Game Objective

The objective of the game is to complete as many prescriptions as possible.  
Patients appear on the right side of the screen and request specific medicines. The player must pick the correct medicine from the shelves and deliver it to the patient.

## How to Play

- Press **Enter** to start the game.
- Move the pharmacist using **Arrow Keys** or **WASD**.
- Look at the medicine letter requested by the patient.
- Go to the medicine shelves on the left side.
- Touch the correct medicine shelf to pick up the medicine.
- Go back to the patient and deliver the medicine.
- Avoid the moving service carts in the middle area.
- Collect bonus items to gain extra time or speed boost.

## Medicine Types

| Letter | Medicine |
|---|---|
| P | Painkiller |
| V | Vitamin |
| S | Syrup |
| A | Antibiotic |
| C | Cream |

## Game Rules

- Correct medicine delivery increases the score.
- Completing a full prescription gives extra points.
- Giving the wrong medicine decreases one life.
- If a patient waits too long, one life is lost.
- Hitting a moving service cart decreases one life.
- The game ends when all lives are lost.

## Features

- 2D Canvas-based gameplay
- Keyboard interaction
- Score and lives system
- Level-based difficulty progression
- Multiple patients in higher levels
- Moving service cart obstacles
- Bonus items
- Patient patience bars
- Start and game over screens

## Computer Graphics Concepts Used

This project demonstrates several computer graphics concepts:

- Translation for player and obstacle movement
- Animation using the game loop
- Collision detection between objects
- Rotation for bonus items
- Scaling effects for medicine shelves
- Continuous rendering with `requestAnimationFrame()`

## Technologies Used

- HTML
- CSS
- JavaScript
- HTML5 Canvas

## Project Status

The game is playable and includes a complete gameplay loop:

Start Screen → Gameplay → Game Over Screen

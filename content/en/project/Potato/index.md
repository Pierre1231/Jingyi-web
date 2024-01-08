---
title: Research class(TA)
summary: This course is designed for sophomore students and utilizes DJI Education platform and a simulation platform developed by our lab, enabling students to complete unmanned aerial vehicle (UAV) and unmanned ground vehicle (UGV) planning and control experiments.
tags:
  - simulation platform
date: '2022-09-27T00:00:00Z'

# Optional external URL for project (replaces project detail page).
external_link: ''

image:
  caption: Photo by Jingyi HUANG
  focal_point: Smart

links:
url_code: ''
url_pdf: ''
url_slides: ''
url_video: ''

# Slides (optional).
#   Associate this project with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides = "example-slides"` references `content/slides/example-slides.md`.
#   Otherwise, set `slides = ""`.

---

# Overall introduction
This project is regarded as the ground vehicle part of the development of the simulation platform -- Potato. The simulation platform is under a project supported by the Ministry of Science and Technology.
I need to develop a ground vehicle dynamic model and a controller for the vehicle to follow a given path. 

# Methods
First, I use the dynamic model in the article[Learning-Based Model Predictive Control for Autonomous Racing](https://ieeexplore.ieee.org/abstract/document/8754713) to design the dynamic model of the ground vehicle. I simplify the model, so that we control the steering angle and throttle. 
Then, I use a vector field to indicate the desired state, so that we can use PID to control the vehicle.

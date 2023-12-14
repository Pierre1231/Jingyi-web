---
title: Research class(TA)
summary: This course is designed for sophomore students and utilizes DJI Education platform and a simulation platform developed by our lab, enabling students to complete unmanned aerial vehicle (UAV) and unmanned ground vehicle (UGV) planning and control experiments.
tags:
  - course
date: '2016-04-27T00:00:00Z'

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

## Overall introduction

---
This course aims to provide students with a good understanding of the principles and applications of robot path planning and control through simulations and experiments. Throughout the course, we utilize a laboratory-developed simulation platform for control and planning simulations. Subsequently, we conduct control and planning experiments using DJI's RoboMaster EP(UGV) and TT(UAV), along with indoor positioning using UWB devices from nooploop company. After students have learned the control and planning theories, they can deepen their understanding through simulations and physical experiments. The course consists of eight sessions: the first three sessions cover relevant theory presented by Assoc. Prof. HAN Liang, the following three sessions involve my instruction on simulation and physical experiments, and the final two sessions include the evaluation of simulation and experimental results.
{style="text-align: justify;"}

## Course content

---

### Theory part

1. **Control theory**: Assoc. Prof. HAN Liang explained linear systems, introduced modeling methods for first-order and second-order systems, discussed control principles based on feedback, and explained the principles of PID control, including how the proportional, integral, and derivative components each affect the system.
{style="text-align: justify;"}

2. **Path planning theory**: Assoc. Prof. HAN Liang explained the problems that need to be addressed in   path planning, which involve finding a collision-free path from point A to point B on a given map. Additionally, the teacher discussed some graph-based path planning algorithms, such as A*.
{style="text-align: justify;"}

3. **Basic hardware knowledge**: Assoc. Prof. HAN Liang explained the fundamental principles of multirotor drones and demonstrated using the DJI Robomaster TT(quadrotor) and its official app. The teacher explained how quadrotors can adjust their attitude by changing the rotational speed of their propellers. Assoc. Prof. HAN Liang also introduced the principles of a Mecanum wheel robot, demonstrating with the DJI RoboMaster EP Mecanum wheel robot and its official app. The teacher explained to the students how Mecanum wheel robots can achieve motion in different directions by adjusting the wheel speeds. We chose Mecanum wheel robots because their dynamic model is relatively simpler when comparing to Ackermann steering vehicles, and they can be simplified to a first-order or second-order system.
{style="text-align: justify;"}

4. **Basic software knowledge**: I primarily introduced the why we use and how we use Anaconda, as well as how to utilize PyCharm for Python development. In the classroom, I guided students in establishing a virtual environment called 'Research Class' for the development of simulations and experiments. I also introduced and demonstrated the simulation platform developped by our lab, providing an explanation of the code responsible for control and planning. I explained how to execute the code for the experimental section and parts related to control and planning.

### Simulation part

### Experiment part

1. **UWB device**: .

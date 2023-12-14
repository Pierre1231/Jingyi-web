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
{style="text-align: justify;"}

### Simulation part

Potato is a large-scale cluster simulation platform developed by our lab. To meet the needs of this class, we have developed a minimal example using the simulation platform display end as the GUI - potato-mini. Students can design and develop agent dynamics, add task environments, and perform control/planning algorithm simulations in potato-mini. Potato-mini is mainly divided into two parts, one is the simulation platform display end, and the other is Potato central. First, download and unzip the display end file Potato-3.x.x.zip, find the Potato.exe in the root directory and double-click to open it, the interface is as shown in the figure below.

{{< figure src="album/earth.jpg" caption="Potato display end" numbered="true" width="500px" >}}

After opening the display end, open the Potato central part's code. Unzip the project file Potato-mini and open it with Pycharm (Open PyCharm, select "File" in the upper left corner, click "Open", open the potato-mini-master file, and you can open the potato-mini project). The development of the simulation part is mainly carried out in the main code of Potato-mini.

### Experiment part

1. **UWB device**: .

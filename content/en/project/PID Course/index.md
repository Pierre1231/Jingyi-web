---
title: PID Course
summary: We have designed a simple PID demo using our lab's simulation platform to assist students in grasping the principles of PID control.
tags:
  - course
date: '2023-03-25T00:00:00Z'

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
This course is designed to give students an intuitive understanding of PID controllers by conducting experiments on a simulation platform. We have designed a simple PID controller in the simulation platform, and through parameter tuning of this controller, students can gain an intuitive understanding of the principles of PID controllers. We have also designed a simple second-order dynamics model for drones in the simulation platform. By controlling the drone to follow a set path, students can verify the control effect of the controller.
{style="text-align: justify; margin: -10px;"}

## Course content
---

### Teaching Content of the Code

1. **PID Controller Principles**: Students can learn how a PID controller works through the implementation of the `PidControl` class. The comments and structured design in the code help students understand how the proportional, integral, and derivative components are calculated independently and combined to form a control signal.
{style="text-align: justify;"}

2. **Trajectory Tracking**: The `desired_trace` function provides a target trajectory, showing students how to set target positions based on the change in time.
{style="text-align: justify;"}

3. **Dynamic System Simulation**: The `SecondOrderDynamics` class demonstrates a simplified dynamic system model, helping students understand the relationship between state updates and control inputs.
{style="text-align: justify;"}

4. **Real-time Simulation**: The main loop simulates the operation of a real-time control system, where students can observe how the controller responds to errors and updates control inputs at each time step.
{style="text-align: justify;"}

5. **Data Visualization**: Through plotting, students can visually comprehend the controller's performance, such as the comparison between the actual and target trajectories, and the error over time.
{style="text-align: justify;"}

### Student Activities

1. **Understanding the Code**: Initially, students need to read and comprehend each part of the code, including how the PID controller operates, system dynamics, target trajectory setting, and the simulation loop.
{style="text-align: justify;"}

2. **Modifying Parameters**: Students can alter the `kp`, `ki`, `kd` parameters in the `PidControl` to see changes in the controller's performance. This helps them understand the impact of these parameters on system behavior.
{style="text-align: justify;"}

3. **Experimenting and Observing**: Students can run the code and observe the drone's flight path and behavior under different PID parameters. By comparing the actual trajectory to the target trajectory, they can learn how to adjust PID parameters to improve system performance.
{style="text-align: justify;"}

4. **Adjusting the Target Trajectory**: Students can modify the `desired_trace` function to try different target trajectories and observe how the PID controller performs with various paths.
{style="text-align: justify;"}

5. **Problem-Solving**: If issues arise during the simulation, such as the drone deviating from the target trajectory, students are expected to analyze the cause of the problem and attempt to solve it, which helps develop their problem-solving skills.
{style="text-align: justify;"}

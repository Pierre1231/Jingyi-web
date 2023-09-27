---
title: Challenge Cup
summary: Our team participated in the 18th "Challenge Cup" National College Student Curricular Academic Science and Technology Works Competition, specifically in the "Jie Bang Gua Shuai" special competition. We designed a multi-agent decision control model for regional information gathering tasks and were awarded the Grand Prize. I was primarily responsible for the design of the multi-agent obstacle avoidance algorithm within the project.
tags:
  -  competition
date: '2023-09-21T00:00:00Z'

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

To inspire university students to actively participate in cutting-edge scientific research addressing critical national needs, the renowned science and technology competition, the "Challenge Cup," introduced the special competition known as "Jie Bang Gua Shuai." This year's competition took place in Guizhou and featured a total of 21 topics, with over 2,000 projects in participation. We were proud to achieve the Grand Prize(特等奖) in this competition.

{{< figure src="album/IMG_5724.jpg" caption="Attending the competition" numbered="true" >}}

Faced with the challenge of information gathering in multiple unmanned marine regions, this project presents a multi-agent decision control model. We have devised multi-agent area coverage and task allocation algorithms and integrated trajectory planning algorithms based on Conflict-Based Search, along with velocity obstacle algorithms to ensure collision avoidance. An online optimization approach is employed to enhance overall coverage efficiency. Algorithm validation is conducted using platforms based on OpenCV and a self-developed simulation platform based on Cesium. Following multiple iterations of testing, our algorithm consistently achieves high-level performance, including an average area coverage rate of 99%, an average correct detection rate of 99%, and an average total time of 61 minutes.

## Achievements
---

The following video showcases our final results (the video has been sped up):

{{< video src="videos/result.mp4" controls="yes" >}}

## Division
---

**HAO Pengkun (Team leader)**

Designed the framework, created the simulation environment, set coverage path planning algorithm, defined multi-agents' decisions, coded OpenCV-based simulation, did the system integration.

**WANG Yue**

Set collaborative exploration and collaborative task allocation algorithm, did the system integration.

**HUANG Jingyi**

Used artificial potential fields algorithm for obstacle avoidance, coded A* algorithm, wrote practical functions such as to calculate the shortest distance between points and a convex hull, etc.

**LIN Yuheng**

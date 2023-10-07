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

## Requirements
---

Duration: Apr. 2023 - Sept. 2023

Design a multi-agent decision control model for collision-free area information collection and target exploration within a convex polygonal target area:

- Complete coverage of the entire area;
- For each target, perform multiple scans at fixed angles;
- Avoid restricted zones and prevent collisions between agents.

In the end, we will deploy our model into the organizer's simulation system, validating it using real ship dynamics. The final results will take into account the agent coverage ratio, the number of collision avoidance failures, and the overall simulation time.

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

Designed a multi-agent collision avoidance algorithm based on RVO (Reciprocal Velocity Obstacles) 

**Rest People**

Built and debugged the cluster simulation platform -- Potato. For more infomation about Potato, please [click here](https://arxiv.org/abs/2308.12698).

**Instructor :** *LI Xiaoduo, [HAN Liang](https://scholar.google.com.hk/citations?hl=zh-CN&user=gx0l_7cAAAAJ), [REN Zhang](https://ieeexplore.ieee.org/author/37418980100)*

## Our plan

---

Our algorithm consists of four algorithmic modules for executing subtasks and a cluster simulation platform for algorithm validation. The algorithmic modules for executing subtasks include the obstacle avoidance/collision avoidance module, the area coverage trajectory planning module, the target exploration module, and the task allocation module for multi-agent cooperation. The cluster simulation platform is built using Python, the OpenCV engine, and the Cesium engine.

{{< figure src="album/framework.png" caption="Framework of our project" numbered="true" >}}

At the outset of algorithm execution, several pieces of information pertaining to the target area are initialized. Subsequently, the algorithm enters a loop to determine whether the task is completed. As long as the task remains incomplete, it executes a region-based coverage path planning algorithm while simultaneously employing a dynamic task allocation algorithm. The agent cluster collaboratively covers the area, thereby enhancing task efficiency. Throughout the entire task process, an obstacle avoidance/collision avoidance algorithm runs in real-time to ensure safety.

### Obstacle Avoidance

在项目开始阶段，智能体只需要和targets进行避障，因此我们选用最简单的避障控制方法，人工势场法。由于主办方没有提供智能体动力学模型，我们使用最简单的二阶模型和pid控制算法，保证不超过主办方提供的最高速度即可。对于规划层，我们只需要通过智能体和环境的信息，设计并输出无碰撞的路径点即可。对于每一个智能体，我需要首先判断它是否需要避障，为此，我设计了need_doa方法进行判断：

```python
def need_doa(self):
    # 判断是否需要进行智能体间避撞
    list_doa_agent = []
    for i in range(self.num_agents):
        for j in range(i + 1, self.num_agents):
            if self.agents[i].check_collision_agent(self.agents[j]):
                list_doa_agent.append([i, j])

    # 判断是否需要进行智能体和障碍物避障
    list_doa_target = []
    for i in range(self.num_agents):
        for target_idx in range(self.num_targets):
            distance = np.linalg.norm(
                np.array([self.agents[i].position])
                - np.array([self.targets[target_idx].coord])
            )

            if distance < self.obstacle_dist:
                if self.list_doa_target_key[target_idx] == 0:
                    self.list_doa_target_key[target_idx] = 1
                else:
                    list_doa_target.append([i, target_idx])

    if len(list_doa_agent) > 0 or len(list_doa_target):
        return True, list_doa_agent, list_doa_target
    else:
        return False, list_doa_agent, list_doa_target

```

在我们获得需要避障的智能体和target之后，针对每一个智能体，获得智能体下一个路径点为终点，智能体现在的位置为起点，计算{{< /math >}}$500m${{< /math >}}范围内targets所产生的斥力和终点所产生的引力。通过引力和斥力的合力，计算下一个路径点。其中为了避免距离target过近导致斥力过大，最终导致路径点生成过远，甚至在整个区域外部，我们设置在{{< /math >}}$50m${{< /math >}}距离内的斥力为恒定值。
{{< /math >}}$$
U_{rep}(q) = \left\{
\begin{array}{ll}
\frac{1}{2}k\_rep(\frac{1}{D(q)}-\frac{1}{Q^*}), &  50< D(q) \leq Q^*  \\
\frac{1}{2}k\_rep(\frac{1}{0.001}-\frac{1}{Q^*}), &  D(q) \leq 50 
\end{array}
\right.
{{< /math >}}$$
其中{{< /math >}}$k\_rep${{< /math >}}是斥力增益常量，{{< /math >}}$D(q)${{< /math >}}是智能体距离target的距离，{{< /math >}}$Q^*${{< /math >}}是计算斥力的临界距离。我们计算出所有target对智能体的斥力矢量并加和，计算出goal对智能体的吸引力，将斥力和吸引力矢量相加获得合力。然后添加基于合力计算出来的路径点。


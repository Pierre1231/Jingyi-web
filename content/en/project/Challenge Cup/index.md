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

在我们获得需要避障的智能体和target之后，针对每一个智能体，获得智能体下一个路径点为终点，智能体现在的位置为起点，计算{{< math >}}$500m${{< /math >}}范围内targets所产生的斥力和终点所产生的引力。通过引力和斥力的合力，计算下一个路径点。其中为了避免距离target过近导致斥力过大，最终导致路径点生成过远，甚至在整个区域外部，我们设置在{{< math >}}$50m${{< /math >}}距离内的斥力为恒定值。
{{< math >}}$$
U_{rep}(q) = \left\{
\begin{array}{ll}
\frac{1}{2}k\_rep(\frac{1}{D(q)}-\frac{1}{Q^*}), &  50< D(q) \leq Q^*  \\
\frac{1}{2}k\_rep(\frac{1}{0.001}-\frac{1}{Q^*}), &  D(q) \leq 50 
\end{array}
\right.
{{< /math >}}$$
其中{{< math >}}$k\_rep${{< /math >}}是斥力增益常量，{{< math >}}$D(q)${{< /math >}}是智能体距离target的距离，{{< math >}}$Q^*${{< /math >}}是计算斥力的临界距离。我们计算出所有target对智能体的斥力矢量并加和，计算出goal对智能体的吸引力，将斥力和吸引力矢量相加获得合力。然后添加基于合力计算出来的路径点。

##### 中期-添加规避区的人工势场法

由于初期的场景设定比较简单，所以我们选择了比较简单的人工势场法作为避障策略。但是在比赛中期，主办方提出要在原场景中添加规避区，我们的智能体需要在不进入规避区的前提下完成区域覆盖任务。规避区为规定区域内的一个凸多边形区域。我寻找凸多边形距离智能体最近的点，把这个点为障碍物，通过同样的方法判断是否需要避障，并且用同样的方法计算斥力。这样，我就可以在不改变避障的整体框架下对规避区进行避障。

{{< figure src="album/forbid_apf.jpg" caption="Calculate U_rep from the convex hull" numbered="true" >}}

寻找规避区离智能体最近的点的方法如下：

```python
def distance_point_to_line(point, line_start, line_end):
    # 计算点到线段的最短距离
    line_start = np.array(line_start)
    line_end = np.array(line_end)
    line_vec = line_end - line_start
    point_vec = point - line_start
    t = np.dot(point_vec, line_vec) / np.dot(line_vec, line_vec)
    t = max(0, min(1, t))  # 确保点在线段上
    closest_point = line_start + t * line_vec
    distance = np.linalg.norm(point - closest_point)
    return distance, closest_point

def shortest_distance_to_polygon(point, polygon_vertices):
    min_distance = float('inf')
    closest_point = None

    # 遍历多边形的边
    for i in range(len(polygon_vertices)):
        start_point = polygon_vertices[i]
        end_point = polygon_vertices[(i + 1) % len(polygon_vertices)]
        distance, closest = distance_point_to_line(point, start_point, end_point)

        # 如果找到更短的距离，更新最小距离和最近点的坐标
        if distance < min_distance:
            min_distance = distance
            closest_point = closest

    return min_distance, closest_point
```



但是经过我的多次测试，发现如果目标点和智能体的位置，均处于规避区某一条边两端点垂线所夹区域内，会出现一个convergent point，无法实现有效的避障。

{{< figure src="album/converge_point.jpg" caption="Convergent point" numbered="true" >}}

##### 后期-A*算法

我意识到，人工势场法无法解决现在的问题，因此我开始寻求更加通用的解法。我使用A*算法作为规划算法，在仿真过程中实时计算智能体到目标点的无碰撞路径。在进行覆盖路径规划的时候已经将地图进行栅格化，我可以直接利用栅格化地图进行规划。代码如下：

```python
#!/usr/bin/env python
# -*- encoding: utf-8 -*-
"""
Author: HUANG Jingyi
File: A_star.py
Date: 2023/9/8 11:28
Email: pierrehuang1998@gmail.com
Description: 
"""

import heapq
import matplotlib.pyplot as plt
import json
import pyproj
import constants
import numpy as np
from Env import Env




class AStarPathPlanner:
    def __init__(self, grid_map):
        self.grid_map = grid_map
        self.rows = len(grid_map)
        self.cols = len(grid_map[0])

    def heuristic(self, current, goal):
        return abs(current[0] - goal[0]) + abs(current[1] - goal[1])

    def find_path(self, start, end):
        start = tuple(start)
        end = tuple(end)
        if start == end:
            return [[start[0], start[1]]]

        open_list = [(0, start)]
        came_from = {}

        g_score = {cell: float('inf') for row in self.grid_map for cell in row}
        g_score[start] = 0

        f_score = {cell: float('inf') for row in self.grid_map for cell in row}
        f_score[start] = self.heuristic(start, end)

        while open_list:
            _, current = heapq.heappop(open_list)

            if current == end:
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                path_list = []
                for tpl in path:

                    path_list.append([tpl[0], tpl[1]])

                # 将path修改为list类型

                return path_list

            add = [
                (0, 1), (0, -1),
                (1, 0), (-1, 0),
                (1, 1), (1, -1),
                (-1, 1), (-1, -1)
            ]

            for dr, dc in add:
                neighbor = (current[0] + dr, current[1] + dc)

                if (
                    0 <= neighbor[0] < self.rows
                    and 0 <= neighbor[1] < self.cols
                    and self.grid_map[neighbor[0]][neighbor[1]] != 1
                ):
                    tentative_g_score = g_score[current] + 1

                    if tentative_g_score < g_score.get(neighbor, float('inf')):
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        f_score[neighbor] = (
                            tentative_g_score + self.heuristic(neighbor, end)
                        )
                        heapq.heappush(open_list, (f_score[neighbor], neighbor))

        return []

    def visualize_path_animation(self, path):
        map_with_path = np.zeros((self.rows, self.cols, 3), dtype=np.uint8)

        for i in range(self.rows):
            for j in range(self.cols):
                if self.grid_map[i][j] == 1:
                    map_with_path[i, j] = [0, 0, 0]  # Black for obstacles
                else:
                    map_with_path[i, j] = [255, 255, 255]  # White for open space

        for node in path:
            map_with_path[node[0], node[1]] = [0, 255, 0]  # Green for path

        # Create visualization figure
        fig, ax = plt.subplots()
        ax.imshow(map_with_path)

        plt.show()

if __name__ == "__main__":

    # 智能体的数量，待探查目标的数量
    num_agents, num_targets = 8, 31
    # 定义投影坐标系的参数
    proj_params = {'proj': 'aea', 'lat_1': 38, 'lat_2': 39, 'lat_0': 38.5,
                   'lon_0': 121.5, 'x_0': 0, 'y_0': 0, 'ellps': 'WGS84', 'units': 'm'}
    # 创建投影坐标系对象
    p = pyproj.Proj(proj_params)
    # 读入challenge-zc-init.json初始化文件
    with open('challenge-zc-init.json', 'r') as f:
        data = json.load(f)
    # 包含所有初始化信息的变量
    meta_args = data['content']['arguments']
    # 任务区域变量（二维列表）
    taskArea = meta_args['taskArea']
    taskArea_new = []
    for _point in taskArea:
        taskArea_new.append(p(_point[0], _point[1]))
    # 智能体初始位置 {"position1":[x, y],...}
    vesPostion = meta_args['vesPosition']
    vesPostion_new = vesPostion
    for i in range(num_agents):
        _point = vesPostion[i]['position']
        vesPostion_new[i]['position'] = p(_point[0], _point[1])
    # 待探查目标初始信息 [{"id": int, "coord": [x, y], "angle": int, "restCheck": int}, ...]
    targets = meta_args['targets']
    targets_new = targets
    for i in range(num_targets):
        _point = targets[i]['coord']
        targets_new[i]['coord'] = p(_point[0], _point[1])
    # 智能体的范围和速度信息
    vesInfo = meta_args['vesInfo']
    # 待探查目标的范围信息
    targetInfo = meta_args['targetInfo']
    # 探查次数发生更改的信息
    changeTargets = meta_args['changeTargets']
    data_new = data
    data_new['content']['arguments']['taskArea'] = taskArea_new
    data_new['content']['arguments']['vesPostion'] = vesPostion_new
    data_new['content']['arguments']['targets'] = targets_new
    # 添加禁航区的信息
    forbidArea = [
        [
            [
                121.67473222,
                38.84573388
            ],
            [
                121.70089122,
                38.84573388
            ],
            [
                121.70940282,
                38.82943606
            ],
            [
                121.67572957,
                38.82791887
            ]
        ],
        [
        ]
    ]
    forbidArea_new = forbidArea
    for i in range(len(forbidArea)):
        _forbid1area = forbidArea[i]
        for j in range(len(_forbid1area)):
            _point = _forbid1area[j]
            forbidArea_new[i][j] = list(p(_point[0], _point[1]))
    with open('challenge-zc.json', 'w') as f:
        json.dump(data_new, f)

    # 读入将经纬度坐标转换为直角坐标的challenge-zc.json初始化文件
    with open("challenge-zc.json") as f:
        data = json.load(f)
    # 包含所有初始化信息的变量
    meta_args = data["content"]["arguments"]
    # 任务区域变量（二维列表）
    taskArea = meta_args["taskArea"]
    # 智能体初始位置 {"position1":[x, y],...}
    vesPostion = meta_args["vesPostion"]
    # 待探查目标初始信息 [{"id": int, "coord": [x, y], "angle": int, "restCheck": int}, ...]
    targets = meta_args["targets"]
    # 智能体的范围和速度信息
    vesInfo = meta_args["vesInfo"]
    # 待探查目标的范围信息
    targetInfo = meta_args["targetInfo"]
    # 探查次数发生更改的信息
    changeTargets = meta_args["changeTargets"]

    # 仿真的时间步（单位秒）
    # 把TStep调大可以加快仿真速度
    TStep = constants.TStep
    # 任务是否结束
    TaskIsEnd = False
    # 覆盖是否结束
    CoverageIsEnd = False
    # 是否需要避障/避撞
    NeedDoa = True
    # 覆盖完成的时间
    coverage_finish_time = None
    # 整个任务的总耗时
    task_finish_time = None

    # 环境初始化
    env = Env(taskArea, forbidArea_new, TStep, num_agents, num_targets, vesPostion, targets, vesInfo, targetInfo,
              changeTargets)
    env.reset()

    # Create a 100x100 grid map with larger obstacles
    grid_map = env.grid_map

    # Create A* path planner object
    path_planner = AStarPathPlanner(grid_map.tolist())  # Convert numpy array to list

    # Define start and end points
    start = [350, 30]
    end = [100, 420]

    # Find the path
    path = path_planner.find_path(start, end)
    # print("Path:", path)

    # Visualize the path animation
    if path:
        path_planner.visualize_path_animation(path)
    else:
        print("Path not found")
```

结果如下：

{{< figure src="album/A_star.jpg" caption="A* algorithm" numbered="true" >}}

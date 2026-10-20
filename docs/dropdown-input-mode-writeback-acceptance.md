# Dropdown inputMode 受控回写：本 Feature 接受的宿主形状及已知限制

本文记录 `fix/dropdown-input-state-consistency` 分支（代码头 `7ed4f17`，Feature users-search-consistency-20261019 / S01）经六轮独立盲审与外部 advisor 裁定（ADV-20261019-1949，处置 A 修正版）后**在本 Feature 已核验宿主范围内**接受的受控回写行为边界，以及两项被明确接受并延期处理的已知回归。它限定的是本次接受范围，不改动库的公开 API 契约本身；发布新版本时，两项已知回归需按仓库规则同步写入 `COMPATIBILITY.md`。

## 已知限制（确认、未修复、本次接受并延期）

- **B1-001（DIFF_CAUSED / P2）**：直接受控 Dropdown 使用非恒等 `getItemLabel`，选中后仅回写 value，且缺少可匹配的 selectedOptions 时，输入显示可能从转换后的选中标签退化为原始 `option.label`（显示信息在乐观草稿释放后未完整保留于 fallback）。
- **B1-002（DIFF_CAUSED / P2）**：FilterControl 的根值已记忆为自由文本，后到 selectedItem 的业务 ID 与其不同，公共 value 未变且没有输入草稿时，已解析的 canonical 标签不能接管显示（显示关联与业务标识混用）。

两项均有最终盲审与 advisor 独立复现证据；当前 lmdo-website 宿主（UserSearchDropdown 同步回写并携带 selectedOptions；FilterControl 宿主 value 与 item 成对写回）不触发。不应建议宿主通过「先清空再设置」、强行修改自由文本值或重新引入 `{#key}` 规避——那会重新触及本次修复保护的草稿、请求与节点生命周期。

## 本次接受的宿主回写形状

| 维度 | 本次接受的行为与边界 |
|---|---|
| 适用模式 | 本次协调机制针对 `search && inputStyle === 'input' && !multiselect`。其他模式沿用原有结论，不借此次裁定扩展其行为承诺。 |
| selection 回传 | 与当前未消费 selection 槽相匹配的可观察值更新，按该次选择的回传处理。已有证据覆盖同步、微任务和 timer 回写。 |
| 多次未完成选择 | 只保留最新 selection 槽。新选择覆盖旧选择；不承诺组件自动丢弃任意乱序到达的旧确认。旧回写不再匹配时可能按外部替换处理。 |
| divergence 清选 | 正常输入路径中的同步普通赋值回写，可以消费 divergence echo 并保留草稿。该资格在既定微任务边界过期；之后的值更新按一般协调规则处理，不能笼统承诺所有异步清选均保留草稿。 |
| 真正外部替换 | 可观察到的根值变化，且不匹配有效 echo 时，重置搜索状态、草稿、候选及历史标签，关闭菜单并中止在途请求。 |
| 与 pending selection 同值的独立替换 | 当前按 selection 回传处理。宿主不能要求组件只凭相同 props 区分两种不同意图。 |
| 后续用户草稿 | selection 回传不会释放与原乐观标签不同的后续草稿。快照仍按文本相等判断；恰好与原乐观标签相同的文本，可以被当作该草稿释放并由 canonical 标签接管。沿用已有边界，不扩大承诺为编辑事件级识别。 |
| 直接 Dropdown 的标签 | 默认标签的 value-only 回传已有覆盖。自定义 getter 在能够取得匹配原始 option / selectedOptions 时正确解析。没有匹配项、仅靠历史 raw label 兜底的组合，保留 B1-001。 |
| `selectedOptions`-only 更新 | 不触发外部替换式重置。显示改善取决于匹配关系以及是否存在优先显示的用户草稿。 |
| FilterControl 的正常回传 | 接受冻结记录中已核验的宿主写回形状，包括选中时协调写回自由文本和业务项、根值与选择身份一致的路径。不能泛化为任何 item/value 更新组合都会自动完成重新关联。 |
| FilterControl 的 item-only 更新 | 有编辑草稿时保留草稿、菜单及在途请求；无草稿且 item 能匹配记忆根值时可改善标签。自由文本根值与后到 item ID 不同、公共值不变且无草稿的组合，保留 B1-002。 |
| 空字符串 | 直接 Dropdown 的空字符串选项仍是合法形状，不作整体排除。FilterControl 当前把空 identifier 丢弃的适配器行为应另行准确描述，不能把两个层面的语义混为一谈。 |
| 同值重选 | 保留 B1-OBS-001 的基线既有分类；不承诺同值回写必然触发 canonical 接管或状态重置，也不将它重新加入本轮修复清单。 |

## 后续任务边界（恢复完整显示契约）

后续工作应明确回答以下接口问题，而不是笼统要求「把 Dropdown 重写一次」；仅恢复 B1-001/B1-002 只需把显示信息与显示关联做完整（原始项 fallback、只参与 `selectedText` 解析的独立显示关联），只有在明确要求更广泛的宿主因果语义时才需要完整的请求—确认—外部替换协议：

| 接口问题 | 应明确的要求 |
|---|---|
| 显示关联 | 自由文本、根值匹配键和业务 ID 可以不同；canonical item 的显示关联不应改变可提交身份。 |
| getter 的输入 | getter 取得原始业务项及 metadata；显示 fallback 保留必要信息，避免丢失或重复转换。 |
| 选择与清选 | 合法选项值 `''` 与「清除选择」的动作具有可区分语义。 |
| 宿主确认 | 如果要求支持任意延迟、拒绝、规范化或乱序确认，需要显式关联到哪一次选择请求。 |
| 外部替换 | 如果相同 value 也应触发独立重置，需要明确的替换信号或版本，而不能依赖值是否变化。 |
| 草稿归属 | 明确后续编辑与 committed selection 的优先关系；如果需要识别「编辑后又输入相同文字」，应使用编辑事件或版本信息。 |

后续任务应保留当前已验证的独立成果：关闭保留文本、稳定输入节点（焦点）、选中终结搜索会话、在途请求 abort 与陈旧结果防护。完整裁定与证据链见 lmdo-website 仓库 `.agent-work/advisor/20261019-1949_users-search-consistency/`（请求/响应档案）与 `.agent-work/reviews/users-search-consistency-20261019-S01-*.md`（六轮盲审与闭包报告）。

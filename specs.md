# Prompt: Simulador Interativo do Círculo Trigonométrico (Seno, Cosseno e Tangente)

Atue como Senior Frontend & Mathematical Visualization Engineer.

Implemente um simulador didático interativo do Círculo Trigonométrico Completo utilizando HTML5 Canvas nativo, CSS moderno e JavaScript modular (ES Modules), sem dependências externas pesadas.

---

## 1. Arquitetura de Arquivos

Mantenha a separação estrita de responsabilidades:

- `index.html`: Layout responsivo em duas colunas (Desktop) ou empilhado (Mobile).
- `style.css`: Tema escuro (Dark Mode), tipografia limpa e layout flexível.
- `js/math.js`: Cálculos vetoriais, conversões e limites angulares.
- `js/renderer.js`: Desenho vetorial no Canvas, eixos, projeções e HiDPI/Retina.
- `js/app.js`: Eventos de mouse/touch, estado global e sincronização do HUD.

---

## 2. Modelo Matemático e Interação

1. **Centro e Raio:**
   - Origem $(x_0, y_0)$ centralizada no Canvas.
   - Raio unitário visual $R$: ajustável dinamicamente via `ResizeObserver` para caber com margem:
     $$R = \min(\text{largura}, \text{altura}) \times 0.35$$
2. **Ângulo Contínuo ($\theta$ nos 4 Quadrantes):**
   - O usuário pode arrastar o ponto terminal sobre a circunferência ou ajustar via slider de $0^\circ$ a $360^\circ$ ($0$ a $2\pi$ radianos).
   - Ângulo a partir do mouse:
     $$\theta = \operatorname{atan2}(-(y_m - y_0), x_m - x_0)$$
     _(Normalizar para o intervalo $[0, 2\pi[$)._
3. **Ponto na Circunferência $P$:**
   - $P_x = x_0 + R \cdot \cos(\theta)$
   - $P_y = y_0 - R \cdot \sin(\theta)$
4. **Eixo da Tangente e Assíntotas:**
   - Eixo vertical da tangente tangenciando a circunferência em $x = x_0 + R$.
   - Ponto de interseção da reta suporte do raio com a reta tangente:
     $$T = (x_0 + R,\; y_0 - R \cdot \tan(\theta))$$
   - Tratamento de assíntotas em $\theta = 90^\circ$ e $\theta = 270^\circ$: quando $\vert{}\cos(\theta)\vert{} < 0.01$, a tangente tende ao infinito; rotular visualmente como "Indefinida / $\pm\infty$" e omitir a projeção gráfica fora dos limites da tela.

---

## 3. Diretrizes Visuais no Canvas

- **Eixos Cartesianos e Círculo:** Eixos $X$ e $Y$ discretos com marcações de $1$, $-1$ e ângulos notáveis ($0^\circ, 90^\circ, 180^\circ, 270^\circ$).
- **Codificação por Cores Consistente:**
  - **Cosseno (projeção no eixo horizontal):** Azul (`#38bdf8`)
  - **Seno (projeção no eixo vertical):** Vermelho/Coral (`#f87171`)
  - **Tangente (segmento no eixo vertical em $x=1$):** Âmbar/Dourado (`#fbbf24`)
  - **Raio / Vetor Diretor:** Roxo (`#a855f7`)
  - **Linhas-guia pontilhadas:** Projeções do ponto $P$ até os eixos correspondentes.
- **Título no Topo:** "Círculo Trigonométrico: Seno, Cosseno e Tangente" em negrito, centralizado no topo com tamanho moderado sem cobrir o círculo.

---

## 4. Painel Didático Lateral (HUD)

Exibir e atualizar em tempo real:

1. **Ângulo:** Valores em Graus ($\theta^\circ$) e em Radianos (notação decimal e fração de $\pi$ aproximada).
2. **Quadrante Atual:** Indicar explicitamente (1º, 2º, 3º ou 4º quadrante) e o sinal algébrico de cada função (+ ou -).
3. **Valores das Funções:**
   - $\cos(\theta) = \dots$
   - $\operatorname{sen}(\theta) = \dots$
   - $\tan(\theta) = \frac{\operatorname{sen}(\theta)}{\cos(\theta)} = \dots$ _(com aviso de indefinição em $90^\circ$ e $270^\circ$)_
4. **Identidade Fundamental:** $\operatorname{sen}^2(\theta) + \cos^2(\theta) = 1.000$.

---

## 5. Diretriz de Execução

Gere ou atualize os arquivos com código limpo, suporte completo a telas sensíveis ao toque (mobile) e redimensionamento automático de janela.

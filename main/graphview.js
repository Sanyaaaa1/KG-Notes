async function loadGraphData() {
  try {
    const response = await fetch('/api/graph');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to load graph data:", error);
    alert("Error loading graph data. See console for details.");
    return { nodes: [], edges_by_node: {} };
  }
}

async function initGraph() {
  
  const data = await loadGraphData();
  console.log('graph data:', data);

  const nodes = data.nodes;
  const links = [];
  
  for (const [source, targets] of Object.entries(data.edges_by_node)) {
    for (const target of targets) {
      links.push({ source, target });
    }
  }

  const svg = d3.select("#graph");
  const width = document.getElementById('graph').clientWidth;
  const height = document.getElementById('graph').clientHeight;

  
  // Clear any existing content
  svg.selectAll("*").remove();

  // --- FORCE SIMULATION ---
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // --- LINKS ---
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 2);

  // --- NODES ---
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 10)
    .attr("fill", "#408649")
    .style("cursor", "pointer")
    .call(drag(simulation))
    .on("click", (event, d) => {
      openNote(d.id);
      closeGraph();
})
    .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).transition().attr("fill", "#3fb44e")
    })
    .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).transition().attr("fill", "#408649");
    });

  // --- LABELS ---
  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("fill", "white")
    .text(d => d.label)
    .attr("font-size", 12)
    .attr("dx", 15)
    .attr("dy", 4)
    .style("font-style", "italic")
    .style("pointer-events", "none");

  // --- UPDATE LOOP ---
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      svg.selectAll('g').attr('transform', event.transform);
    });

  svg.call(zoom);
}

// --- DRAG BEHAVIOR ---
function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

window.initGraph = initGraph;


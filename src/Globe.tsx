import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Country, Threat, Unit } from './types';

interface GlobeProps {
  countries: any[]; // GeoJSON features
  selectedCountryId: string | null;
  playerCountryId?: string | null;
  onSelectCountry: (country: Country) => void;
  getCountryFill: (countryId: string) => string;
  getFlag: (name: string) => string;
  threats: Threat[];
  units: Unit[];
  showThreats?: boolean;
  showUnits?: boolean;
}

export default function Globe({ countries, selectedCountryId, playerCountryId, onSelectCountry, getCountryFill, getFlag, threats, units, showThreats = true, showUnits = true }: GlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{id: string, name: string, x: number, y: number} | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || countries.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const initialScale = Math.min(width, height) / 2.2;
    // Initial rotation focused on Turkey/Europe
    const projection = d3.geoOrthographic()
      .scale(initialScale)
      .translate([width / 2, height / 2])
      .rotate([-35, -39, 0]); 

    const pathGenerator = d3.geoPath().projection(projection);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Add defs for glow
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Add ocean
    const ocean = svg.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale())
      .attr('fill', '#0f172a') // slate-900
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    // Group for countries
    const g = svg.append('g');

    // Draw countries
    const countryPaths = g.selectAll('path')
      .data(countries)
      .enter()
      .append('path')
      .attr('d', pathGenerator as any)
      .attr('fill', d => getCountryFill(d.id || d.properties.name))
      .attr('stroke', d => {
        const id = d.id || d.properties.name;
        if (id === selectedCountryId) return '#ffffff';
        if (id === playerCountryId) return '#fbbf24'; // Amber for player country
        return 'rgba(255,255,255,0.1)';
      })
      .attr('stroke-width', d => {
        const id = d.id || d.properties.name;
        if (id === selectedCountryId) return 2;
        if (id === playerCountryId) return 1.5;
        return 0.5;
      })
      .attr('class', 'cursor-pointer transition-colors duration-200 hover:brightness-125')
      .style('filter', d => (d.id || d.properties.name) === selectedCountryId ? 'url(#glow)' : 'none')
      .on('mousemove', (event, d) => {
        setHoverInfo({
          id: d.id || d.properties.name,
          name: d.properties.name,
          x: event.clientX,
          y: event.clientY
        });
      })
      .on('mouseout', () => {
        setHoverInfo(null);
      })
      .on('click', (event, d) => {
        onSelectCountry({ id: d.id || d.properties.name, name: d.properties.name });
      });

    // Draw Threat Indicators
    if (showThreats) {
      const threatGroups = g.selectAll('.threat-indicator')
        .data(countries.filter(c => threats.some(t => t.countryId === (c.id || c.properties.name))))
        .enter()
        .append('g')
        .attr('class', 'threat-indicator pointer-events-none')
        .attr('transform', d => {
          const centroid = pathGenerator.centroid(d as any);
          const isVisible = pathGenerator(d as any) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0]}, ${centroid[1]})` : 'scale(0)';
        });

      // Add a pulsing background circle
      threatGroups.append('circle')
        .attr('r', 12)
        .attr('fill', d => {
          const countryThreats = threats.filter(t => t.countryId === (d.id || d.properties.name));
          const maxSeverity = Math.max(...countryThreats.map(t => t.severity));
          if (maxSeverity >= 4) return 'rgba(239, 68, 68, 0.4)'; // red
          if (maxSeverity >= 2) return 'rgba(249, 115, 22, 0.4)'; // orange
          return 'rgba(234, 179, 8, 0.4)'; // yellow
        })
        .attr('class', 'animate-ping');

      // Main icon background
      threatGroups.append('circle')
        .attr('r', 8)
        .attr('fill', d => {
          const countryThreats = threats.filter(t => t.countryId === (d.id || d.properties.name));
          const maxSeverity = Math.max(...countryThreats.map(t => t.severity));
          if (maxSeverity >= 4) return '#ef4444'; // red
          if (maxSeverity >= 2) return '#f97316'; // orange
          return '#eab308'; // yellow
        })
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))');

      // Exclamation mark
      threatGroups.append('text')
        .attr('y', 3)
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .attr('font-weight', '900')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'middle')
        .text('!');
        
      // Threat count badge
      const badgeGroup = threatGroups.append('g')
        .attr('transform', 'translate(6, -6)');
        
      badgeGroup.append('circle')
        .attr('r', 5)
        .attr('fill', '#1e293b')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1);
        
      badgeGroup.append('text')
        .attr('y', 3)
        .attr('fill', 'white')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .text(d => threats.filter(t => t.countryId === (d.id || d.properties.name)).length);
    }

    // Draw Unit Indicators
    if (showUnits) {
      const unitGroups = g.selectAll('.unit-indicator')
        .data(countries.filter(c => units.some(u => u.countryId === (c.id || c.properties.name))))
        .enter()
        .append('g')
        .attr('class', 'unit-indicator pointer-events-none')
        .attr('transform', d => {
          const centroid = pathGenerator.centroid(d as any);
          const isVisible = pathGenerator(d as any) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0] + 12}, ${centroid[1] - 12})` : 'scale(0)';
        });

      unitGroups.append('circle')
        .attr('r', 6)
        .attr('fill', d => units.find(u => u.countryId === (d.id || d.properties.name))?.type === 'Army' ? '#3b82f6' : '#8b5cf6')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
    }

    // Implement Dragging for Rotation
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('drag', (event) => {
        const rotate = projection.rotate();
        const k = 75 / projection.scale();
        projection.rotate([
          rotate[0] + event.dx * k,
          rotate[1] - event.dy * k,
          rotate[2]
        ]);
        
        // Update paths
        countryPaths.attr('d', pathGenerator as any);
        
        // Update indicators
        g.selectAll('.threat-indicator').attr('transform', (d: any) => {
          const centroid = pathGenerator.centroid(d);
          const isVisible = pathGenerator(d) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0]}, ${centroid[1]})` : 'scale(0)';
        });
        g.selectAll('.unit-indicator').attr('transform', (d: any) => {
          const centroid = pathGenerator.centroid(d);
          const isVisible = pathGenerator(d) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0] + 12}, ${centroid[1] - 12})` : 'scale(0)';
        });
      });

    // Implement Zooming for Scale
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .filter(event => event.type === 'wheel' || event.type === 'dblclick') // Only zoom on wheel/dblclick to not interfere with drag
      .on('zoom', (event) => {
        projection.scale(initialScale * event.transform.k);
        ocean.attr('r', projection.scale());
        
        // Update paths
        countryPaths.attr('d', pathGenerator as any);
        
        // Update indicators
        g.selectAll('.threat-indicator').attr('transform', (d: any) => {
          const centroid = pathGenerator.centroid(d);
          const isVisible = pathGenerator(d) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0]}, ${centroid[1]})` : 'scale(0)';
        });
        g.selectAll('.unit-indicator').attr('transform', (d: any) => {
          const centroid = pathGenerator.centroid(d);
          const isVisible = pathGenerator(d) !== null && !isNaN(centroid[0]);
          return isVisible ? `translate(${centroid[0] + 12}, ${centroid[1] - 12})` : 'scale(0)';
        });
      });

    svg.call(drag as any);
    svg.call(zoom as any);

  }, [countries, selectedCountryId, playerCountryId, getCountryFill, threats, units, showThreats, showUnits]);

  return (
    <div ref={containerRef} className="w-full h-full flex-1 relative flex items-center justify-center overflow-hidden">
      <svg ref={svgRef} className="absolute inset-0 w-full h-full drop-shadow-2xl cursor-grab active:cursor-grabbing" style={{ overflow: 'visible' }} />
      
      {hoverInfo && (
        <div 
          className="fixed pointer-events-none z-50 bg-gray-900/95 border border-gray-700 p-3 rounded-xl shadow-2xl backdrop-blur-sm transform -translate-x-1/2 -translate-y-full mt-[-15px]"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2">
            <span className="text-2xl drop-shadow-md">{getFlag(hoverInfo.name)}</span>
            <span className="font-bold text-white text-sm tracking-wide">{hoverInfo.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs text-gray-400 flex justify-between gap-4">
              <span>Aktif Tehditler:</span>
              <span className={`font-bold ${threats.filter(t => t.countryId === hoverInfo.id).length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {threats.filter(t => t.countryId === hoverInfo.id).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

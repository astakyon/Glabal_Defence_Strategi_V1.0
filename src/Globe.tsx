import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Country, Threat, Unit, CountryMetadata, MapMode, CountryState } from './types';

interface GlobeProps {
  selectedCountryId: string | null;
  playerCountryId?: string | null;
  onSelectCountry?: (country: Country) => void;
  getCountryFill: (countryId: string) => string;
  getFlag: (name: string, countryMetadata: Record<string, CountryMetadata>) => React.JSX.Element;
  countryMetadata: Record<string, CountryMetadata>;
  threats: Threat[];
  units: Unit[];
  worldState: Record<string, CountryState>;
  mapMode: MapMode;
  showThreats?: boolean;
  showUnits?: boolean;
  interactive?: boolean;
}

interface CountryFeature {
  type: string;
  properties: { name: string; englishName: string; numericId?: number };
  geometry: any;
  id: string;
}

export default function Globe({ selectedCountryId, playerCountryId, onSelectCountry, getCountryFill, getFlag, countryMetadata, threats, units, worldState, mapMode, showThreats = true, showUnits = true, interactive = true }: GlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{id: string, name: string, x: number, y: number} | null>(null);

  const countries: CountryFeature[] = React.useMemo(() => Object.values(countryMetadata)
    .filter(c => c.geometry)
    .map(c => ({
      type: 'Feature',
      properties: { name: c.tr, englishName: c.en, numericId: c.numericId },
      geometry: c.geometry,
      id: c.en
    })), [countryMetadata]);

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
      .data(countries.filter(d => d && d.properties))
      .enter()
      .append('path')
      .attr('d', pathGenerator as any)
      .attr('fill', (d: CountryFeature) => {
        const id = d.id || d.properties.name;
        const fill = getCountryFill(id);
        return fill;
      })
      .attr('stroke', (d: CountryFeature) => {
        const id = d.id || d.properties.name;
        if (id === selectedCountryId) return '#ffffff';
        if (id === playerCountryId) return '#fbbf24'; // Amber for player country
        return 'rgba(255,255,255,0.1)';
      })
      .attr('stroke-width', (d: CountryFeature) => {
        const id = d.id || d.properties.name;
        if (id === selectedCountryId) return 2;
        if (id === playerCountryId) return 1.5;
        return 0.5;
      })
      .attr('class', interactive ? 'cursor-pointer transition-colors duration-200 hover:brightness-125' : '')
      .style('filter', (d: CountryFeature) => (d.id || d.properties.name) === selectedCountryId ? 'url(#glow)' : 'none')
      .on('mousemove', (event, d: CountryFeature) => {
        if (!interactive || !d || !d.properties) return;
        setHoverInfo({
          id: d.id || d.properties.name,
          name: d.properties.name || 'Bilinmeyen',
          x: event.clientX,
          y: event.clientY
        });
      })
      .on('mouseout', () => {
        if (!interactive) return;
        setHoverInfo(null);
      })
      .on('click', (event, d: CountryFeature) => {
        if (!interactive || !d || !d.properties || !onSelectCountry) return;
        onSelectCountry({ 
            id: d.id || d.properties.name, 
            name: d.properties.name || 'Bilinmeyen',
            numericId: d.properties.numericId
        } as Country);
      });

    // Draw War Lines
    if (mapMode === 'wars') {
      const warPairs: [string, string][] = [];
      Object.entries(worldState).forEach(([id, state]) => {
        state.enemies.forEach(enemyId => {
          // Ensure we don't draw the same war twice (A-B and B-A)
          if (!warPairs.find(pair => (pair[0] === id && pair[1] === enemyId) || (pair[0] === enemyId && pair[1] === id))) {
            warPairs.push([id, enemyId]);
          }
        });
      });

      warPairs.forEach(([id1, id2]) => {
        const country1 = countries.find(c => c.id === id1);
        const country2 = countries.find(c => c.id === id2);
        if (country1 && country2) {
          const centroid1 = pathGenerator.centroid(country1 as any);
          const centroid2 = pathGenerator.centroid(country2 as any);
          
          if (!isNaN(centroid1[0]) && !isNaN(centroid2[0])) {
            g.append('line')
              .attr('x1', centroid1[0])
              .attr('y1', centroid1[1])
              .attr('x2', centroid2[0])
              .attr('y2', centroid2[1])
              .attr('stroke', '#ef4444')
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '4,4');
          }
        }
      });
    }

    // Draw Threat Indicators
    if (showThreats && interactive) {
      // ... (rest of the threat drawing logic)
      const threatGroups = g.selectAll('.threat-indicator')
        .data(countries.filter((c: CountryFeature) => c && c.properties && threats.some(t => t.countryId === (c.id || c.properties.name))))
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
        .attr('fill', (d: CountryFeature) => {
          if (!d || !d.properties) return 'rgba(234, 179, 8, 0.4)';
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
        .attr('fill', (d: CountryFeature) => {
          if (!d || !d.properties) return '#eab308';
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
        .text(d => {
          if (!d || !d.properties) return 0;
          return threats.filter(t => t.countryId === (d.id || d.properties.name)).length;
        });
    }

    // Draw Unit Indicators
    if (showUnits && interactive) {
      const unitGroups = g.selectAll('.unit-indicator')
        .data(countries.filter(c => c && c.properties && units.some(u => u.countryId === (c.id || c.properties.name))))
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
        .attr('fill', d => {
          if (!d || !d.properties) return '#3b82f6';
          return units.find(u => u.countryId === (d.id || d.properties.name))?.type === 'Army' ? '#3b82f6' : '#8b5cf6';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
    }

    // Implement Dragging for Rotation
    if (interactive) {
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
    }

  }, [countries, selectedCountryId, playerCountryId, getCountryFill, threats, units, mapMode, showThreats, showUnits, interactive]);

  return (
    <div ref={containerRef} className="w-full h-full flex-1 relative flex items-center justify-center overflow-hidden">
      <svg ref={svgRef} className={`absolute inset-0 w-full h-full drop-shadow-2xl ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ overflow: 'visible' }} />
      
      {interactive && hoverInfo && (
        <div 
          className="fixed pointer-events-none z-50 bg-gray-900/95 border border-gray-700 p-3 rounded-xl shadow-2xl backdrop-blur-sm transform -translate-x-1/2 -translate-y-full mt-[-15px]"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2">
            <span className="text-2xl drop-shadow-md">{getFlag(hoverInfo.name, countryMetadata)}</span>
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

import React, { useState } from 'react';
import PropTypes from 'prop-types';

function ComplexCard({
  title,
  tags,
  imageUrl,
  description,
  stats,
  actions,
  expandedContent,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header with image */}
      <div
        style={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9 aspect ratio
          backgroundColor: '#f0f0f0',
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                margin: '0 4px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#333',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{title}</h3>
        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '14px' }}>
          {description}
        </p>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            margin: '16px 0',
          }}
        >
          {Object.entries(stats).map(([label, value]) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ borderTop: '1px solid #eee', margin: '16px -16px 0' }}>
          <div style={{ display: 'flex', padding: '0 16px' }}>
            {['details', 'activity', 'related'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab ? '2px solid #007bff' : '2px solid transparent',
                  color: activeTab === tab ? '#007bff' : '#666',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div
            style={{
              padding: '16px',
              marginTop: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            {expandedContent}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #eee',
          }}
        >
          <div>
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                style={{
                  padding: '8px 16px',
                  marginRight: '8px',
                  border: '1px solid #007bff',
                  borderRadius: '4px',
                  backgroundColor: action.primary ? '#007bff' : 'transparent',
                  color: action.primary ? 'white' : '#007bff',
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>
    </div>
  );
}

ComplexCard.propTypes = {
  title: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  imageUrl: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  stats: PropTypes.objectOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ])).isRequired,
  actions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    primary: PropTypes.bool,
  })).isRequired,
  expandedContent: PropTypes.node.isRequired,
};

export default ComplexCard;

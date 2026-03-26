# Example Prompts for Testing

A curated set of prompt templates you can use to explore and test Promptinel's drift detection capabilities.

## Classification Prompts

### Intent Classification

```
Classify the intent of this user message:

"{user_message}"

Options: billing, technical_support, feature_request, cancellation, feedback, other

Return only the classification label.
```

**Test Cases:**
- "I want to cancel my subscription" → cancellation
- "How do I reset my password?" → technical_support
- "Can you add dark mode?" → feature_request

### Sentiment Analysis

```
Analyze the sentiment of this customer review:

"{review_text}"

Return: positive, negative, or neutral
```

**Test Cases:**
- "This product is amazing! Best purchase ever." → positive
- "Terrible experience, would not recommend." → negative
- "It works as described." → neutral

## Extraction Prompts

### Entity Extraction

```
Extract entities from this text:

"{text}"

Return JSON with: person, company, date, amount, invoice_number
```

**Test Cases:**
- "John Smith from Acme Corp called about invoice #12345 for $500 due on March 15th"
- "Sarah Johnson at TechStart needs help with order #ABC-789"

### Key Information Extraction

```
Extract key information from this support ticket:

"{ticket_text}"

Return JSON with: issue_type, severity, affected_component, customer_impact
```

## Summarization Prompts

### Support Ticket Summary

```
Summarize this support ticket in 2-3 sentences:

"{ticket_text}"

Focus on: what the issue is, what the customer tried, and current status.
```

**Test Cases:**
- Long support tickets with multiple back-and-forth messages
- Technical issues with error logs
- Feature requests with detailed explanations

### Meeting Notes Summary

```
Summarize these meeting notes into action items:

"{meeting_notes}"

Format as a bulleted list with owner and deadline for each item.
```

## Generation Prompts

### Email Response

```
Generate a professional email response to this customer inquiry:

"{customer_email}"

Tone: friendly and helpful
Include: acknowledgment, solution, and next steps
```

### Product Description

```
Write a compelling product description for:

Product: {product_name}
Features: {features}
Target audience: {audience}

Length: 2-3 paragraphs
Tone: professional but approachable
```

## Code Generation Prompts

### Function Documentation

```
Generate documentation for this function:

{code}

Include: description, parameters, return value, example usage
Format: JSDoc style
```

### Test Case Generation

```
Generate test cases for this function:

{code}

Include: happy path, edge cases, error cases
Format: Vitest syntax
```

## Translation Prompts

### Technical Translation

```
Translate this technical documentation from English to {target_language}:

"{text}"

Maintain technical terms and code examples unchanged.
```

## Reasoning Prompts

### Problem Solving

```
Solve this problem step by step:

"{problem_description}"

Show your reasoning at each step.
```

### Decision Making

```
Given these options:

{options}

And these criteria:

{criteria}

Recommend the best option and explain why.
```

## Tips for Testing Drift

1. **Start with a baseline**: Run the prompt once and set it as baseline
2. **Test variations**: Change wording slightly and check drift score
3. **Test with different models**: Compare outputs across providers
4. **Monitor over time**: Run the same prompt daily to detect model updates
5. **Use thresholds wisely**: 
   - 0.1-0.2 for critical prompts (strict)
   - 0.3-0.4 for general prompts (moderate)
   - 0.5+ for creative prompts (lenient)

## Common Drift Scenarios

### Model Version Updates
- Provider updates model without notice
- Behavior changes subtly
- Promptinel detects the drift

### Prompt Engineering Changes
- You modify the prompt
- Want to verify it still works correctly
- Compare before/after snapshots

### Provider Switching
- Testing migration from one provider to another
- Ensure outputs remain consistent
- Use diff command to compare

### A/B Testing
- Testing two prompt variations
- Measure which performs better
- Track drift over time for each variant

---

> Made with ❤️ by [@diegosantdev](https://github.com/diegosantdev)

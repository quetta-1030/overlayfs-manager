# Contributing to OverlayFS Manager

First off, thank you for considering contributing to OverlayFS Manager!

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include system information** (OS, kernel version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of how this enhancement would be used**

### Pull Requests

- Fill in the required template
- Follow the existing code style
- Include comments where needed
- Test your changes thoroughly

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/overlayfs-manager.git
cd overlayfs-manager

# Install dependencies
npm install

# Link globally for development
npm link

# Now you can use 'ovm' command
ovm --help
```

## Testing

```bash
# Run tests
npm test

# Test installation (requires root)
sudo npm run install-system
```

## Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Comment your code where necessary

## Questions?

Feel free to open an issue for any questions or discussions.

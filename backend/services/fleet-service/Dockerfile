# Use .NET 9 SDK as base
FROM mcr.microsoft.com/dotnet/sdk:9.0

# Set working directory
WORKDIR /app

# Copy solution and project files first (for caching)
COPY fleet-service.sln .
COPY fleet-service.csproj .
COPY Application/*.csproj ./Application/
COPY Domain/*.csproj ./Domain/
COPY Infrastructure/*.csproj ./Infrastructure/
COPY Presentation/*.csproj ./Presentation/

# Restore NuGet packages
RUN dotnet restore

# Copy all source files
COPY . .

# Install dotnet-ef global tool
RUN dotnet tool install --global dotnet-ef --version 9.*

# Add dotnet tools to PATH
ENV PATH="$PATH:/root/.dotnet/tools"

# Expose service port
EXPOSE 8083

# Start service with hot reload in development
CMD ["dotnet", "watch", "run", "--urls", "http://+:8083"]
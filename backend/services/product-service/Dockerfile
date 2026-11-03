# Use .NET 9 SDK as base
FROM mcr.microsoft.com/dotnet/sdk:9.0

# Set working directory
WORKDIR /app

# Copy solution and project files first (for layer caching)
COPY product-service.sln .
COPY product-service.csproj .
COPY Application/*.csproj ./Application/
COPY Domain/*.csproj ./Domain/
COPY Infrastructure/*.csproj ./Infrastructure/

# Restore NuGet packages
RUN dotnet restore

# Copy ALL source files (Controllers, Protos, Program.cs, Migrations, Properties, appsettings.json, etc.)
COPY . .

# Install dotnet-ef global tool
RUN dotnet tool install --global dotnet-ef --version 9.*

# Add dotnet tools to PATH
ENV PATH="$PATH:/root/.dotnet/tools"

# Expose service port
EXPOSE 8085

# Start service with hot reload in development
CMD ["dotnet", "watch", "run", "--urls", "http://+:8085"]
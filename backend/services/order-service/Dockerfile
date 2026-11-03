FROM mcr.microsoft.com/dotnet/sdk:9.0

WORKDIR /app

# Copy only main project
COPY order-service.csproj .

# Copy Protos if needed
COPY Protos ./Protos

# Restore only main project (FAST + cached)
RUN dotnet restore order-service.csproj

# Copy rest of source
COPY . .

# Install EF tools
RUN dotnet tool install --global dotnet-ef --version 9.*
ENV PATH="$PATH:/root/.dotnet/tools"

EXPOSE 8087

CMD ["dotnet", "watch", "run", "--urls", "http://+:8087"]